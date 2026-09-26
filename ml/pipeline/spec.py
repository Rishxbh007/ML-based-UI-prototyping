"""
Application Specification.

The structured intermediate representation that sits BETWEEN language
understanding and UI generation. Everything the pipeline understands is
assembled here into one explainable object; the renderer/generator can consume
this instead of reaching back into raw keyword extraction.

Shape (see build_spec):
  domain, platform, target_users, purpose, goals, features, entities, actions,
  relationships, constraints, authentication, data_requirements, complexity,
  screens, navigation, confidence
"""
from __future__ import annotations
from dataclasses import asdict
from typing import List, Dict, Any

from .entities import Entity
from .relationships import Relationship
from .understanding import Understanding
from .screen_planner import ScreenPlan
from .intent import Intent, primary_intent


def _complexity(n_features: int, n_screens: int, n_entities: int) -> Dict[str, Any]:
    score = n_features * 1.0 + n_screens * 0.6 + n_entities * 0.5
    if score < 5:
        level = "simple"
    elif score < 10:
        level = "moderate"
    else:
        level = "complex"
    return {"level": level, "score": round(score, 1),
            "features": n_features, "screens": n_screens, "entities": n_entities}


def _overall_confidence(domain_conf: float, features: List[Dict], spacy_on: bool) -> Dict[str, Any]:
    feat_conf = (sum(f.get("confidence", 0) for f in features) / len(features)) if features else 0.0
    # weighted blend; deeper NLP (spaCy) modestly raises trust in extraction
    overall = 0.5 * domain_conf + 0.4 * feat_conf + (0.1 if spacy_on else 0.0)
    return {
        "domain": round(domain_conf, 3),
        "extraction": round(feat_conf, 3),
        "overall": round(min(overall, 0.99), 3),
        "nlp_depth": "dependency-parse (spaCy)" if spacy_on else "lexical fallback",
    }


def build_spec(
    *,
    domain: str,
    domain_confidence: float,
    domain_alternatives: List[Dict],
    domain_analysis: Dict[str, Any],
    intents: List[Intent],
    platform: str,
    target_users: str,
    purpose: str,
    understanding: Understanding,
    features: List[Dict],
    entities: List[Entity],
    actions: List[str],
    relationships: List[Relationship],
    screens: List[ScreenPlan],
    navigation: Dict,
    spacy_on: bool,
) -> Dict[str, Any]:
    # If the domain prediction is weak, keep alternative interpretations so the
    # system doesn't pretend to be certain.
    ambiguous = domain_confidence < 0.45 or domain_analysis.get("multi_domain", False)
    alternatives = [a for a in domain_alternatives if a["label"] != domain][:2] if domain_confidence < 0.45 else []

    return {
        # primary domain kept as `domain` for backward compatibility
        "domain": domain,
        "primary_domain": domain_analysis.get("primary", domain),
        "secondary_domain": domain_analysis.get("secondary_domain"),
        "capabilities": domain_analysis.get("capabilities", []),
        "cross_cutting_capabilities": domain_analysis.get("cross_cutting_capabilities", []),
        "multi_domain": domain_analysis.get("multi_domain", False),
        "platform": platform,
        "target_users": target_users,
        "purpose": purpose,
        "intent": primary_intent(intents),
        "intents": [asdict(i) for i in intents],
        "goals": understanding.goals,
        "features": features,
        "entities": [asdict(e) for e in entities],
        "actions": actions,
        "relationships": [asdict(r) for r in relationships],
        "constraints": understanding.constraints,
        "authentication": understanding.authentication,
        "data_requirements": understanding.data_requirements,
        "priorities": understanding.priorities,
        "complexity": _complexity(len(features), len(screens), len(entities)),
        "screens": [asdict(s) for s in screens],
        "navigation": navigation,
        "confidence": _overall_confidence(domain_confidence, features, spacy_on),
        "ambiguous": ambiguous,
        "alternative_domains": alternatives,
    }
