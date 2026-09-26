"""
Analysis orchestrator — the public entry point of the ML pipeline.

    analyze(description) -> dict

The pipeline now runs the full requirement-understanding chain:

  preprocessing -> domain classification -> feature/action extraction
  -> entity extraction -> relationship extraction -> higher-level understanding
  -> screen planning -> navigation planning -> Application Specification

BACKWARD COMPATIBILITY: the returned dict still contains every field the old
`/api/analyze` produced (appType, appTypeConfidence, appTypeProbabilities,
targetUsers, purpose, features, actions, entities, inferredScreens, pipeline),
so the existing frontend keeps working unchanged. A NEW additive field,
`applicationSpec`, carries the richer structured understanding.

Degrades gracefully: without the trained model it uses a keyword fallback for
the domain; without spaCy the deep entity/relationship extraction returns less
but the spec still builds.
"""
from __future__ import annotations
from typing import Dict, Any, List

from .preprocessing import preprocess, spacy_available
from .extraction import extract_features, extract_actions, extract_target_users
from .classifier import AppTypeClassifier, confidence_decision
from .entities import extract_entities
from .relationships import extract_relationships
from .understanding import understand
from .screen_planner import plan_screens, plan_to_inferred_screens
from .navigation_planner import plan_navigation
from .intent import detect_intents
from .domain_analysis import analyze_domains
from .spec import build_spec

# Keyword fallback for app type when no trained model exists.
_APPTYPE_KEYWORDS = {
    "food-delivery": ["restaurant", "food", "meal", "delivery", "dish", "cuisine", "order"],
    "fitness": ["workout", "fitness", "exercise", "gym", "run", "calorie", "training", "health"],
    "banking": ["bank", "transfer", "money", "payment", "wallet", "transaction", "fund", "bill"],
    "ecommerce": ["shop", "product", "buy", "store", "cart", "wishlist", "purchase", "catalog"],
    "education": ["course", "lesson", "learn", "quiz", "student", "study", "exam", "tutor"],
    "social": ["post", "follow", "friend", "feed", "share", "like", "chat", "story"],
    "travel": ["flight", "hotel", "trip", "travel", "book", "destination", "tour", "vacation"],
    "productivity": ["task", "todo", "note", "reminder", "project", "habit", "planner", "schedule"],
}

_PURPOSE_TEMPLATES = {
    "food-delivery": "Let users discover restaurants and order food for delivery.",
    "fitness": "Help users track workouts and monitor their fitness progress.",
    "banking": "Let users manage accounts, transfer money and track spending.",
    "ecommerce": "Let users browse products and make purchases.",
    "education": "Let users take courses and track their learning.",
    "social": "Let users share content and connect with others.",
    "travel": "Let users discover destinations and book travel.",
    "productivity": "Help users organize tasks and stay productive.",
}


def _fallback_app_type(tokens: List[str]) -> Dict[str, Any]:
    tset = set(tokens)
    scores = {label: sum(1 for k in kws if k in tset) for label, kws in _APPTYPE_KEYWORDS.items()}
    total = sum(scores.values()) or 1
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top = ranked[0][0] if ranked[0][1] > 0 else "productivity"
    probs = [(lbl, round(sc / total, 3)) for lbl, sc in ranked]
    conf = round(scores[top] / total, 3) if scores[top] else 0.4
    # Evidence for the keyword fallback = how many domain keywords matched at
    # all. Zero matches means the fallback is guessing "productivity" with no
    # support, which must surface as insufficient evidence (not a 0.4 default).
    recognized = int(sum(scores.values()))
    return {"label": top, "confidence": conf, "probabilities": probs,
            "recognized": recognized, "analyzed": len(tokens),
            "engine": "keyword-fallback (train the model for ML classification)"}


def _clarification_message(decision: str) -> str:
    if decision == "insufficient_evidence":
        return (
            "I couldn't recognize enough about the kind of app you want to build. "
            "Try describing what users actually do — for example "
            "\"browse and order food\", \"track workouts\", or \"transfer money and pay bills\"."
        )
    if decision == "out_of_scope":
        return (
            "This looks like it's outside the app types I was trained on. I can "
            "confidently design food-delivery, fitness, banking, e-commerce, "
            "education, social, travel and productivity apps. Try rephrasing "
            "around one of those, or describe the core actions users take so I "
            "can map them onto screens I know."
        )
    # low_confidence
    return (
        "Your description could fit several kinds of app and I'm not confident which one "
        "you mean. Add a sentence about the main thing users do so I can pick the right screens."
    )


def analyze(description: str) -> Dict[str, Any]:
    pre = preprocess(description)
    spacy_on = spacy_available()

    # --- 1. domain classification ----------------------------------------
    if AppTypeClassifier.is_trained():
        clf = AppTypeClassifier.load()
        pred = clf.predict(description)
        app_type = pred.label
        app_conf = round(pred.confidence, 3)
        app_probs = [{"label": l, "score": round(s, 3)} for l, s in pred.probabilities]
        clf_engine = "TF-IDF + trained classifier"
        evidence_recognized, evidence_analyzed = pred.recognized, pred.analyzed
    else:
        fb = _fallback_app_type(pre.tokens)
        app_type = fb["label"]
        app_conf = fb["confidence"]
        app_probs = [{"label": l, "score": s} for l, s in fb["probabilities"]]
        clf_engine = fb["engine"]
        evidence_recognized, evidence_analyzed = fb["recognized"], fb["analyzed"]

    classifier_label = app_type  # keep the raw classifier output for transparency

    # --- 1b. confidence / uncertainty decision ---------------------------
    # Reliability comes from EVIDENCE (did the model recognize the input?) plus
    # the raw distribution's shape (top probability and its margin over the
    # runner-up). No probability is modified here — we only decide whether the
    # result is trustworthy enough to drive generation.
    raw_scores = sorted((p["score"] for p in app_probs), reverse=True)
    top_prob = raw_scores[0] if raw_scores else 0.0
    margin = round(top_prob - raw_scores[1], 3) if len(raw_scores) > 1 else top_prob
    decision = confidence_decision(top_prob, margin, evidence_recognized, evidence_analyzed)
    needs_clarification = not decision["confident"]
    clarification = _clarification_message(decision["decision"]) if needs_clarification else None
    classification = {
        "decision": decision["decision"],
        "confident": decision["confident"],
        "topProbability": round(top_prob, 3),
        "margin": margin,
        "evidence": {
            "recognized": evidence_recognized,
            "analyzed": evidence_analyzed,
            "coverage": round(evidence_recognized / evidence_analyzed, 3) if evidence_analyzed else 0.0,
        },
    }

    # --- 2. feature + action extraction ----------------------------------
    feats = extract_features(description, pre)
    features = [{"name": f.name, "confidence": round(f.confidence, 3), "source": f.source} for f in feats]
    actions = extract_actions(pre)

    # --- 3. multi-domain reasoning ---------------------------------------
    # Reason about the PRIMARY PURPOSE rather than trusting the raw label: a
    # capability like payments/booking must not, by itself, decide the domain.
    domain_info = analyze_domains(app_probs, features)
    app_type = domain_info["primary"]            # reasoned primary purpose
    app_conf = domain_info["primary_confidence"]

    # --- 4. deep understanding (spaCy where available) -------------------
    entities = extract_entities(description, pre)
    relationships = extract_relationships(description)
    target_users = extract_target_users(description)
    understanding = understand(description, pre, entities, relationships, features)
    intents = detect_intents(relationships, actions, tokens=pre.tokens)

    # --- 5. screen + navigation planning ---------------------------------
    screen_plans = plan_screens(app_type, features, entities, understanding)
    navigation = plan_navigation(app_type, screen_plans)
    inferred_screens = plan_to_inferred_screens(screen_plans)

    purpose = _PURPOSE_TEMPLATES.get(app_type, "Deliver the described experience to users.")

    # --- 6. assemble the Application Specification -----------------------
    spec = build_spec(
        domain=app_type,
        domain_confidence=app_conf,
        domain_alternatives=app_probs,
        domain_analysis=domain_info,
        intents=intents,
        platform=understanding.platform,
        target_users=target_users,
        purpose=purpose,
        understanding=understanding,
        features=features,
        entities=entities,
        actions=actions,
        relationships=relationships,
        screens=screen_plans,
        navigation=navigation,
        spacy_on=spacy_on,
    )

    extraction_engine = "spaCy dependency parse + rules" if spacy_on else "lexical rules (spaCy unavailable)"

    return {
        # ---- existing contract (unchanged shape) ----
        "appType": app_type,
        "appTypeConfidence": app_conf,
        "appTypeProbabilities": app_probs,
        "targetUsers": target_users,
        "purpose": purpose,
        "features": features,
        "actions": actions,
        # top-level entities keep the old {text, kind} shape for the frontend;
        # the richer entities (with confidence/mentions) live in applicationSpec.
        "entities": [{"text": e.name, "kind": e.kind} for e in entities],
        "inferredScreens": inferred_screens,
        "pipeline": {
            "preprocessing": pre.engine,
            "classifier": clf_engine,
            "extraction": extraction_engine,
            # transparency: raw classifier label vs the reasoned primary domain
            "classifier_label": classifier_label,
            "reasoned_primary": app_type,
        },
        # ---- NEW: confidence / uncertainty decision ----
        # additive + backward-compatible. When the model has too little evidence
        # (e.g. meaningless input) or no class is clearly ahead, the frontend
        # shows a clarification prompt instead of silently generating a
        # potentially wrong prototype. Raw probabilities above are untouched.
        "needsClarification": needs_clarification,
        "clarification": clarification,
        "classification": classification,
        # ---- NEW: richer structured understanding ----
        "applicationSpec": spec,
    }
