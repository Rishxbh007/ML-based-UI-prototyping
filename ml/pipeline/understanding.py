"""
Higher-level requirement understanding.

Derives the structured, human-meaningful facts that sit above raw tokens:
goals, constraints, platform, authentication, data requirements and priorities.
These are computed from the dependency parse + extracted entities/relationships
where possible, with small, organised heuristics (not sprawling keyword lists)
as a reliable backbone. Every derived fact carries a confidence.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Optional

from .preprocessing import PreprocessResult
from .relationships import Relationship
from .entities import Entity

_ACTOR_SUBJECTS = {"user", "customer", "member", "student", "people", "learner", "client"}

# constraint keyword -> canonical constraint (kept small + organised on purpose)
_CONSTRAINTS = {
    "security": ["secure", "security", "encrypted", "safe", "private", "privacy", "protected"],
    "offline": ["offline", "no internet", "without internet"],
    "realtime": ["real time", "realtime", "live", "instant", "instantly"],
    "performance": ["fast", "quick", "lightweight", "responsive"],
    "accessibility": ["accessible", "accessibility", "inclusive"],
    "free": ["free", "no cost", "no fee"],
    "multilanguage": ["multilingual", "languages", "localization", "localisation"],
}

_AUTH_SIGNALS = ["login", "log in", "sign in", "signin", "sign up", "signup",
                 "register", "account", "authenticate", "auth", "profile", "password"]
_AUTH_METHODS = {
    "otp": ["otp", "one time password", "phone number", "mobile number", "sms"],
    "social": ["google", "facebook", "social login", "apple sign"],
    "biometric": ["fingerprint", "face id", "biometric"],
}

# capability / data signals -> data requirement
_DATA_SIGNALS = {
    "media": ["photo", "photos", "image", "images", "video", "videos", "picture", "gallery"],
    "location": ["location", "map", "maps", "nearby", "gps", "route", "address"],
    "payments": ["pay", "payment", "card", "wallet", "checkout", "transaction", "money", "transfer"],
    "notifications": ["notification", "notifications", "reminder", "reminders", "alert", "push"],
    "messaging": ["chat", "message", "messages", "messaging", "call"],
    "calendar": ["schedule", "calendar", "appointment", "booking", "slot", "date"],
    "analytics": ["progress", "stats", "insights", "analytics", "report", "chart", "history"],
}


@dataclass
class Understanding:
    goals: List[Dict] = field(default_factory=list)          # {goal, confidence}
    constraints: List[Dict] = field(default_factory=list)    # {constraint, confidence}
    platform: str = "mobile"
    authentication: Dict = field(default_factory=dict)       # {required, methods, confidence}
    data_requirements: List[Dict] = field(default_factory=list)  # {name, confidence}
    priorities: Dict = field(default_factory=dict)           # {primary:[], secondary:[]}


def _text_lower(text: str) -> str:
    return " " + text.lower() + " "


def derive_goals(relationships: List[Relationship]) -> List[Dict]:
    """User goals = verb+object phrases where the actor is the user."""
    goals: List[Dict] = []
    seen = set()
    for r in relationships:
        if r.kind != "svo":
            continue
        actor = r.source in _ACTOR_SUBJECTS or r.source == "user"
        phrase = f"{r.relation} {r.target}"
        if actor and phrase not in seen:
            seen.add(phrase)
            goals.append({"goal": phrase, "confidence": 0.75})
    return goals[:8]


def detect_platform(text: str) -> str:
    t = _text_lower(text)
    if " web " in t or "website" in t:
        if "mobile" in t or "app" in t:
            return "cross-platform"
        return "web"
    if "ios" in t and "android" in t:
        return "mobile (iOS + Android)"
    if "ios" in t or "iphone" in t:
        return "mobile (iOS)"
    if "android" in t:
        return "mobile (Android)"
    return "mobile"


def detect_constraints(text: str) -> List[Dict]:
    t = _text_lower(text)
    out = []
    for name, kws in _CONSTRAINTS.items():
        if any(k in t for k in kws):
            out.append({"constraint": name, "confidence": 0.7})
    return out


def detect_authentication(text: str) -> Dict:
    t = _text_lower(text)
    hits = [k for k in _AUTH_SIGNALS if k in t]
    required = len(hits) > 0
    methods = [m for m, kws in _AUTH_METHODS.items() if any(k in t for k in kws)]
    if required and not methods:
        methods = ["email"]  # sensible default when auth is implied
    return {
        "required": required,
        "methods": methods,
        # auth is implied for most mobile apps even if unstated
        "confidence": 0.85 if required else 0.5,
        "assumed": not required,
    }


def detect_data_requirements(text: str, entities: List[Entity]) -> List[Dict]:
    t = _text_lower(text)
    out = []
    for name, kws in _DATA_SIGNALS.items():
        if any(k in t for k in kws):
            out.append({"name": name, "confidence": 0.75})
    # entities themselves are data the app must persist
    if entities:
        top = ", ".join(e.name for e in entities[:4])
        out.append({"name": f"persist entities ({top})", "confidence": 0.7})
    return out


def rank_priorities(features: List[Dict]) -> Dict:
    """Split features into primary (high confidence) and secondary."""
    ranked = sorted(features, key=lambda f: f.get("confidence", 0), reverse=True)
    primary = [f["name"] for f in ranked if f.get("confidence", 0) >= 0.7][:4]
    secondary = [f["name"] for f in ranked if f["name"] not in primary]
    return {"primary": primary, "secondary": secondary}


def understand(
    text: str,
    pre: PreprocessResult,
    entities: List[Entity],
    relationships: List[Relationship],
    features: List[Dict],
) -> Understanding:
    return Understanding(
        goals=derive_goals(relationships),
        constraints=detect_constraints(text),
        platform=detect_platform(text),
        authentication=detect_authentication(text),
        data_requirements=detect_data_requirements(text, entities),
        priorities=rank_priorities(features),
    )
