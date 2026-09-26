"""
Feature + action extraction stage.

Two mechanisms, combined:
  1) Semantic similarity (optional, sentence-transformers): embed the
     requirement and each canonical feature phrase, keep features whose
     cosine similarity exceeds a threshold. Reports source="ml".
  2) Keyword/lexical rules over the preprocessed tokens as a reliable
     fallback and booster. Reports source="rule".

This hybrid is the honest story: embeddings when available, deterministic
rules always. Output feeds screen inference + the generation engine.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Optional
from .preprocessing import PreprocessResult

# Canonical feature bank: feature -> trigger keywords (lemmas).
FEATURE_BANK: Dict[str, List[str]] = {
    "authentication": ["login", "signin", "sign", "signup", "register", "account", "auth", "password"],
    "search": ["search", "find", "discover", "browse", "explore", "filter", "lookup"],
    "listing": ["list", "catalog", "feed", "restaurant", "product", "course", "item", "browse"],
    "details": ["detail", "details", "view", "info", "description", "profile"],
    "cart": ["cart", "basket", "bag", "add", "wishlist"],
    # checkout is about PAYING for a purchase — booking words live under "booking"
    # so an appointment app is not treated as an ecommerce checkout.
    "checkout": ["checkout", "order", "pay", "payment", "purchase", "buy"],
    "tracking": ["track", "tracking", "progress", "status", "monitor", "log", "history"],
    "profile": ["profile", "account", "settings", "preference"],
    "payments": ["pay", "payment", "transfer", "money", "wallet", "transaction", "bill", "fund"],
    "messaging": ["chat", "message", "messaging", "comment", "reply", "notification"],
    "social": ["follow", "like", "share", "post", "friend", "feed", "story"],
    "content": ["lesson", "course", "video", "quiz", "workout", "exercise", "article", "content"],
    "booking": ["book", "booking", "reserve", "schedule", "flight", "hotel", "trip", "appointment"],
    "reviews": ["review", "rating", "rate", "star", "feedback"],
    "dashboard": ["dashboard", "overview", "summary", "stats", "insight", "chart", "report"],
}

# Action verbs we surface (for the "user actions" section + flow labels).
ACTION_VERBS: Dict[str, List[str]] = {
    "Login": ["login", "signin", "sign"],
    "Sign up": ["signup", "register"],
    "Search": ["search", "find", "discover", "browse", "explore"],
    "Select": ["select", "choose", "pick", "view", "open"],
    "Add to cart": ["cart", "add", "basket", "bag"],
    "Checkout / Pay": ["checkout", "pay", "payment", "purchase", "buy", "order"],
    "Book / Reserve": ["book", "reserve", "schedule"],
    "Transfer money": ["transfer", "send", "fund"],
    "Track": ["track", "monitor", "progress", "status"],
    "Post / Share": ["post", "share", "upload"],
    "Follow": ["follow", "subscribe"],
    "Save": ["save", "bookmark", "wishlist"],
}


@dataclass
class ExtractedFeature:
    name: str
    confidence: float
    source: str  # "ml" | "rule"


_EMBED = None
_EMBED_TRIED = False
_FEATURE_KEYS = list(FEATURE_BANK.keys())


def _get_embedder():
    global _EMBED, _EMBED_TRIED
    if _EMBED_TRIED:
        return _EMBED
    _EMBED_TRIED = True
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        _EMBED = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception:
        _EMBED = None
    return _EMBED


def _rule_features(pre: PreprocessResult) -> Dict[str, float]:
    """Keyword-overlap score per feature (0..1)."""
    token_set = set(pre.tokens)
    scores: Dict[str, float] = {}
    for feat, kws in FEATURE_BANK.items():
        hits = sum(1 for k in kws if k in token_set)
        if hits:
            # saturating score: 1 hit=0.6, 2=0.8, 3+=~0.9+
            scores[feat] = min(0.6 + 0.15 * (hits - 1), 0.97)
    return scores


def _semantic_features(text: str) -> Dict[str, float]:
    embed = _get_embedder()
    if embed is None:
        return {}
    try:
        import numpy as np  # noqa
        from numpy import dot
        from numpy.linalg import norm
        req_vec = embed.encode(text, normalize_embeddings=True)
        feat_vecs = embed.encode(_FEATURE_KEYS, normalize_embeddings=True)
        out: Dict[str, float] = {}
        for key, fv in zip(_FEATURE_KEYS, feat_vecs):
            sim = float(dot(req_vec, fv))
            if sim >= 0.28:
                out[key] = round(sim, 3)
        return out
    except Exception:
        return {}


def extract_features(text: str, pre: PreprocessResult) -> List[ExtractedFeature]:
    rule = _rule_features(pre)
    sem = _semantic_features(text)
    merged: Dict[str, ExtractedFeature] = {}

    for feat, sc in rule.items():
        merged[feat] = ExtractedFeature(feat, sc, "rule")
    for feat, sc in sem.items():
        # embeddings can add features rules missed, or boost confidence
        if feat not in merged or sc > merged[feat].confidence:
            src = "ml" if feat not in rule else "ml"
            merged[feat] = ExtractedFeature(feat, max(sc, merged.get(feat, ExtractedFeature(feat, 0, "ml")).confidence), src)

    # authentication is almost always present in an app; add softly if absent
    if "authentication" not in merged:
        merged["authentication"] = ExtractedFeature("authentication", 0.55, "rule")

    return sorted(merged.values(), key=lambda f: f.confidence, reverse=True)


def extract_actions(pre: PreprocessResult) -> List[str]:
    token_set = set(pre.tokens)
    found = []
    for action, kws in ACTION_VERBS.items():
        if any(k in token_set for k in kws):
            found.append(action)
    if "Login" not in found:
        found.insert(0, "Login")
    return found


def extract_target_users(text: str) -> str:
    """Very light heuristic for 'target users' — looks for 'for <X>'."""
    import re
    # Capture the phrase after "for", stopping at the first clause/verb boundary.
    m = re.search(r"\bfor ([a-z][a-z ]*?)(?=\s+(?:where|who|that|to|with|and|,|\.)|$)", text.lower())
    if m:
        who = m.group(1).strip()
        # drop a trailing generic noun that isn't the audience
        who = re.sub(r"\b(app|application|users?)\b$", "", who).strip()
        if 2 < len(who) < 40:
            return who
    return "general mobile users"
