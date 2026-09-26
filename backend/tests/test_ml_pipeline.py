"""
Tests for the ML analysis pipeline.

These exercise the real pipeline logic. The app-type classification tests work
even without a trained model (they assert on the keyword-fallback behavior),
and they get stronger once `python -m ml.training.train` has produced the
model. Run from the project root:  pytest backend/tests
"""
from __future__ import annotations
import os
import sys

# make the top-level `ml` package importable
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from ml.pipeline.analyze import analyze
from ml.pipeline.preprocessing import preprocess
from ml.pipeline.screen_inference import infer_screens


def test_preprocess_extracts_content_tokens():
    r = preprocess("A food delivery app where users search restaurants and pay")
    assert "food" in r.tokens
    assert "search" in r.tokens
    # stopwords removed
    assert "the" not in r.tokens and "app" not in r.tokens


def test_analyze_food_delivery_shape():
    res = analyze("A food delivery app to browse restaurants, add meals to cart and checkout")
    assert res["appType"] in {"food-delivery", "ecommerce"}  # closely related classes
    assert 0.0 <= res["appTypeConfidence"] <= 1.0
    # probability distribution present and sums to ~1 when trained; always non-empty
    assert len(res["appTypeProbabilities"]) >= 1
    names = {f["name"] for f in res["features"]}
    assert {"cart", "checkout"} & names
    roles = {s["role"] for s in res["inferredScreens"]}
    # cart + checkout are supported by the requirement; login is NOT forced now
    # (Phase 2: generic screens only appear when the requirement supports them).
    assert {"cart", "checkout"} <= roles


def test_analyze_detects_actions_and_users():
    res = analyze("A fitness app for college students to log workouts and track progress")
    assert res["targetUsers"] == "college students"
    assert "Login" in res["actions"]


def test_infer_screens_are_ordered_and_deduped():
    screens = infer_screens("ecommerce", ["authentication", "search", "cart", "checkout"])
    roles = [s["role"] for s in screens]
    assert len(roles) == len(set(roles))  # no duplicates
    # splash/login come before checkout/confirmation
    assert roles.index("login") < roles.index("checkout")


def test_analyze_pipeline_reports_engine():
    res = analyze("a note taking app to manage tasks and reminders")
    assert "classifier" in res["pipeline"]
    assert "preprocessing" in res["pipeline"]
