"""
Multi-domain understanding.

The old pipeline forced every requirement into ONE domain. Real requirements
often combine a primary purpose with supporting capabilities:

  "book fitness classes and pay for them"
     primary domain: fitness
     capabilities:   booking, payments

This module separates three ideas that the old system conflated:
  * PRIMARY DOMAIN  — what kind of app it is (from the trained classifier).
  * SECONDARY DOMAIN — a genuinely different domain the classifier also ranks
    highly (only reported when the distribution is bimodal — i.e. real
    ambiguity, not noise).
  * CAPABILITIES — cross-cutting functions (payments, booking, social, …) that
    appear across domains. These come from the already-extracted features, so
    no new keyword lists are introduced.

This is what lets Morph describe multi-domain apps honestly instead of picking
one label and hiding the rest.
"""
from __future__ import annotations
from typing import List, Dict, Any

# Features that are cross-cutting capabilities rather than a domain in
# themselves. (Derived from the existing feature vocabulary — not new lists.)
_CAPABILITY_OF_FEATURE = {
    "payments": "payments",
    "checkout": "payments",
    "cart": "commerce",
    "booking": "booking",
    "messaging": "messaging",
    "social": "social",
    "tracking": "tracking",
    "reviews": "reviews",
    "content": "content",
    "search": "search",
    "dashboard": "analytics",
}

# Cross-cutting capabilities that could indicate a second domain.
_MULTI_DOMAIN_SIGNALS = {"payments", "booking", "social", "messaging", "commerce"}

# The domain a cross-cutting capability is most associated with. Used ONLY to
# detect (and gently correct) a capability-driven misclassification — e.g. the
# classifier picking "banking" just because "pay" appeared. This is a compact
# capability->domain association, not a keyword list.
_CAPABILITY_HOME = {
    "payments": "banking",
    "booking": "travel",
    "social": "social",
    "messaging": "social",
    "commerce": "ecommerce",
}

# Capabilities that are NATIVE to a domain (so their presence is expected, not
# a sign of multi-domain). A capability that is cross-cutting AND not native to
# the primary domain is what flags genuine multi-domain scope.
_NATIVE_CAPABILITIES = {
    "food-delivery": {"payments", "commerce", "booking", "search"},
    "ecommerce": {"payments", "commerce", "search"},
    "banking": {"payments"},
    "fitness": {"tracking"},
    "education": {"content", "search"},
    "social": {"social", "messaging"},
    "travel": {"booking", "payments", "search"},
    "productivity": {"tracking"},
}


def analyze_domains(
    probabilities: List[Dict[str, Any]],
    features: List[Dict[str, Any]],
) -> Dict[str, Any]:
    probs = sorted(probabilities, key=lambda p: p["score"], reverse=True)
    primary = probs[0]["label"] if probs else "productivity"
    primary_conf = probs[0]["score"] if probs else 0.0

    # Which cross-cutting capabilities are present, and which domains are merely
    # their "home"? If the classifier picked a domain only because a capability
    # pointed there (e.g. banking from "pay"), and it is not confident, prefer a
    # better-supported non-capability-home alternative as the PRIMARY domain.
    present_caps = set()
    for f in features:
        cap = _CAPABILITY_OF_FEATURE.get(f["name"])
        if cap:
            present_caps.add(cap)
    capability_homes = {_CAPABILITY_HOME[c] for c in present_caps if c in _CAPABILITY_HOME}

    reassigned = None
    if primary in capability_homes and primary_conf < 0.6 and len(probs) > 1:
        for cand in probs[1:]:
            if (cand["label"] not in capability_homes
                    and cand["score"] >= 0.15
                    and cand["score"] >= 0.5 * primary_conf):
                reassigned = {"from": primary, "to": cand["label"],
                              "reason": "primary looked capability-driven; "
                                        "a better-supported purpose domain was preferred"}
                primary, primary_conf = cand["label"], cand["score"]
                break

    # A secondary DOMAIN is only reported when the classifier is genuinely torn
    # between two domains — the best-scoring domain OTHER than the primary
    # (which may have been reassigned above).
    secondary_domain = None
    others = [p for p in probs if p["label"] != primary]
    if others:
        second = others[0]
        if second["score"] >= 0.20 and second["score"] >= 0.45 * primary_conf:
            secondary_domain = {"label": second["label"], "score": round(second["score"], 3)}

    # Capabilities from extracted features (confidence-weighted).
    capabilities: List[Dict[str, Any]] = []
    seen = set()
    for f in sorted(features, key=lambda x: x.get("confidence", 0), reverse=True):
        cap = _CAPABILITY_OF_FEATURE.get(f["name"])
        if cap and cap not in seen:
            seen.add(cap)
            capabilities.append({"capability": cap, "confidence": f.get("confidence", 0.6)})

    cross_cutting = [c["capability"] for c in capabilities if c["capability"] in _MULTI_DOMAIN_SIGNALS]
    native = _NATIVE_CAPABILITIES.get(primary, set())
    # capabilities that are cross-cutting AND foreign to the primary domain
    unexpected = [c for c in cross_cutting if c not in native]

    # genuinely multi-domain if the classifier is bimodal OR the app carries a
    # capability that doesn't belong to its primary domain (e.g. fitness+payments)
    multi_domain = bool(secondary_domain) or len(unexpected) >= 1

    return {
        "primary": primary,
        "primary_confidence": round(primary_conf, 3),
        "secondary_domain": secondary_domain,
        "capabilities": capabilities,
        "cross_cutting_capabilities": cross_cutting,
        "unexpected_capabilities": unexpected,
        "multi_domain": multi_domain,
        "reassigned": reassigned,
    }
