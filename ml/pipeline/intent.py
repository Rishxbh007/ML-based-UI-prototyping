"""
Intent detection.

An "intent" is *what the user is trying to do* — booking, purchase, payment,
tracking, learning, sharing, etc. It is distinct from the app DOMAIN and from a
FEATURE.

Intents are derived, in priority order, from:
  1. the ACTION VERBS in the dependency-parsed relationships (strongest signal),
  2. a few NOUN cues for intents usually expressed as nouns (reminder,
     subscription),
  3. the canonical action list (covers the no-spaCy path).

Design rules that fix the earlier bugs:
  * Authentication is a SUPPORTING intent — it is never the primary intent when
    a real goal (book / buy / pay / track / …) is present, and it is only
    inferred from an explicit login/register verb, never from the always-present
    default "Login" action.
  * Multiple intents are supported (one requirement can have several goals).

The verb→intent map is a compact category system over verbs (not domain keyword
lists), so it generalises to unseen requirements.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Optional, Iterable
from collections import defaultdict

from .relationships import Relationship

# verb (lemma) -> intent category.
_VERB_INTENT: Dict[str, str] = {
    # booking / scheduling
    "book": "booking", "reserve": "booking", "schedule": "booking", "appoint": "booking",
    # purchase (acquiring a specific item/course/ticket)
    "buy": "purchase", "purchase": "purchase", "checkout": "purchase", "shop": "purchase",
    # ordering (placing an order, esp. food/goods)
    "order": "ordering", "add": "ordering",
    # payment / money movement
    "pay": "payment", "transfer": "payment", "send": "payment", "split": "payment",
    "withdraw": "payment", "deposit": "payment", "recharge": "payment",
    # tracking / monitoring
    "track": "tracking", "monitor": "tracking", "log": "tracking", "record": "tracking",
    "measure": "tracking",
    # learning / consuming content
    "learn": "learning", "study": "learning", "watch": "learning", "read": "learning",
    "enroll": "learning", "practice": "learning",
    # discovery / browsing
    "browse": "discovery", "search": "discovery", "find": "discovery", "discover": "discovery",
    "explore": "discovery", "filter": "discovery", "compare": "discovery",
    # social / sharing
    "share": "social", "post": "social", "follow": "social", "like": "social",
    "comment": "social", "connect": "social", "invite": "social",
    # communication
    "chat": "communication", "message": "communication",
    # management / organising
    "manage": "management", "organize": "management", "organise": "management",
    "plan": "management", "create": "management", "edit": "management",
    # rating / feedback
    "rate": "feedback", "review": "feedback",
    # notifications
    "remind": "notification", "notify": "notification", "alert": "notification",
    # subscription
    "subscribe": "subscription",
    # authentication (explicit only)
    "login": "authentication", "register": "authentication", "signup": "authentication",
    "authenticate": "authentication",
}

# Intents that are commonly expressed as NOUNS rather than verbs.
_NOUN_INTENT = {
    "reminder": "notification", "notification": "notification", "alert": "notification",
    "subscription": "subscription",
}

_SUPPORTING = {"authentication"}  # never the primary intent when a goal exists


@dataclass
class Intent:
    intent: str
    confidence: float
    evidence: List[str]  # the words that triggered it


def detect_intents(
    relationships: List[Relationship],
    actions: List[str],
    tokens: Optional[Iterable[str]] = None,
) -> List[Intent]:
    evidence: Dict[str, List[str]] = defaultdict(list)

    # 1. verbs from dependency-parsed relationships (strongest)
    for r in relationships:
        verb = r.relation.split()[0]  # phrasal "pay for" -> "pay"
        intent = _VERB_INTENT.get(verb)
        if intent:
            evidence[intent].append(verb)

    # 2. noun cues (reminder/subscription, usually not verbs)
    for tok in (tokens or []):
        intent = _NOUN_INTENT.get(tok)
        if intent and tok not in evidence[intent]:
            evidence[intent].append(tok)

    # 3. canonical action fallback — but DO NOT infer authentication here
    #    (the default "Login" action must not create an auth intent).
    _action_intent = {
        "Search": "discovery", "Select": "discovery", "Add to cart": "ordering",
        "Checkout / Pay": "payment", "Book / Reserve": "booking",
        "Transfer money": "payment", "Track": "tracking", "Post / Share": "social",
        "Follow": "social",
    }
    for a in actions:
        intent = _action_intent.get(a)
        if intent and not evidence[intent]:
            evidence[intent].append(a.lower())

    if not evidence:
        return []

    intents = [
        Intent(name, round(min(0.55 + 0.2 * len(set(v)), 0.97), 3), sorted(set(v)))
        for name, v in evidence.items()
    ]
    # rank: real goals first (supporting intents like auth sink to the bottom),
    # then by confidence.
    intents.sort(key=lambda i: (i.intent not in _SUPPORTING, i.confidence), reverse=True)
    return intents


def primary_intent(intents: List[Intent]) -> str:
    for i in intents:
        if i.intent not in _SUPPORTING:
            return i.intent
    return intents[0].intent if intents else "unspecified"
