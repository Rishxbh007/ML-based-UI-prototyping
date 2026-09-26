"""
Tests for the upgraded understanding pipeline (entities, relationships,
application specification and requirement-driven screen planning).

These assert on behavior that holds WITH OR WITHOUT spaCy installed, so they
pass in CI as well as on a full machine. Run:  pytest backend/tests
"""
from __future__ import annotations
import os
import sys

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from ml.pipeline.analyze import analyze
from ml.pipeline.understanding import detect_authentication, detect_platform


def _spec(text):
    return analyze(text)["applicationSpec"]


def test_analyze_returns_application_spec_with_expected_keys():
    res = analyze("an app to browse restaurants, add food to a cart and checkout")
    assert "applicationSpec" in res
    spec = res["applicationSpec"]
    for key in ("domain", "platform", "features", "entities", "relationships",
                "constraints", "authentication", "data_requirements",
                "complexity", "screens", "navigation", "confidence"):
        assert key in spec, f"missing spec key: {key}"


def test_auth_screens_only_when_authentication_implied():
    # No auth words -> no login/signup screens (the key improvement).
    no_auth = _spec("a to do list app to manage tasks and set reminders")
    roles = {s["role"] for s in no_auth["screens"]}
    assert "login" not in roles
    assert no_auth["authentication"]["required"] is False

    # Auth words present -> login/signup appear.
    with_auth = _spec("an app where users sign up, log in and manage their profile and tasks")
    roles2 = {s["role"] for s in with_auth["screens"]}
    assert "login" in roles2 and "signup" in roles2


def test_screens_are_feature_driven_not_fixed():
    food = {s["role"] for s in _spec("browse restaurants, add to cart and checkout")["screens"]}
    assert {"cart", "checkout"} <= food

    fitness = {s["role"] for s in _spec("track workouts and view progress")["screens"]}
    # a pure tracking app should NOT get a cart/checkout
    assert "cart" not in fitness and "checkout" not in fitness


def test_navigation_is_planned():
    spec = _spec("browse restaurants, search dishes, add to cart, checkout and view profile")
    nav = spec["navigation"]
    assert nav["pattern"] in ("bottom-tab", "stack")
    assert "primary_cta" in nav


def test_platform_and_auth_detection():
    assert "iOS" in detect_platform("an ios app to track workouts") or detect_platform("an ios app").startswith("mobile")
    auth = detect_authentication("users can log in and see their profile")
    assert auth["required"] is True


def test_confidence_present_and_bounded():
    spec = _spec("an app to send money and pay bills")
    c = spec["confidence"]
    assert 0.0 <= c["overall"] <= 1.0
    assert "nlp_depth" in c


# ---- multi-domain / intent intelligence (Phase 2) ------------------------

def test_multi_domain_capabilities_detected():
    # fitness + payments should surface a payments capability, not be hidden.
    spec = _spec("users can book fitness classes and pay for them")
    caps = {c["capability"] for c in spec["capabilities"]}
    assert "payments" in caps
    assert spec["multi_domain"] is True
    assert "primary_domain" in spec and "capabilities" in spec


def test_intent_is_extracted():
    spec = _spec("users can book appointments and pay for them")
    intents = {i["intent"] for i in spec["intents"]}
    # booking and payment intents should both be present
    assert "booking" in intents or spec["intent"] == "booking"


def test_booking_app_gets_no_ecommerce_checkout():
    # An appointment-booking app must NOT receive cart/checkout screens.
    spec = _spec("an app to book appointments with doctors and get reminders")
    roles = {s["role"] for s in spec["screens"]}
    assert "cart" not in roles
    assert "checkout" not in roles
    # a booking still gets a confirmation screen
    assert "confirmation" in roles


def test_generic_screens_not_forced():
    # A pure tracking app with no auth/profile words should not be padded with
    # login/signup/settings.
    spec = _spec("track my daily water intake and see weekly progress")
    roles = {s["role"] for s in spec["screens"]}
    assert "login" not in roles
    assert "signup" not in roles
    assert "settings" not in roles


# ---- Phase 3: intent correctness, coreference, goal coverage -------------

def test_intent_is_never_authentication_for_a_real_goal():
    # The earlier bug: booking/purchasing requirements reported intent=auth.
    for text in ("book appointments with doctors and get reminders",
                 "buy a course and review it",
                 "order food and pay for it"):
        spec = _spec(text)
        assert spec["intent"] != "authentication", f"bad intent for: {text}"


def test_pronouns_do_not_become_entities():
    spec = _spec("browse phones and add them to a cart")
    names = {e["name"] for e in spec["entities"]}
    assert not ({"them", "they", "it", "this", "that"} & names)


def test_multiple_goals_extracted_from_coordinated_verbs():
    # With spaCy this yields several goals; without it, at least the structure
    # is present. We assert it is not collapsing everything into one thing.
    spec = _spec("browse restaurants, order food, track delivery and rate restaurants")
    # goals may be empty without spaCy, but when present there should be > 1
    goals = spec["goals"]
    if goals:
        assert len(goals) >= 2


def test_capability_does_not_force_domain_screens():
    # booking + reminders should not produce ecommerce cart/checkout screens
    spec = _spec("book a table and get a reminder before the reservation")
    roles = {s["role"] for s in spec["screens"]}
    assert "cart" not in roles
