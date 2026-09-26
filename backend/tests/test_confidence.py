"""Pure-logic regression tests for the confidence / uncertainty decision layer.

These tests exercise `confidence_decision` — the additive layer that classifies
the RELIABILITY of a prediction without changing any probability. They need no
trained model (no sklearn/joblib), so they run anywhere and pin the abstain
behaviour the frontend depends on:

  * clear domain (high top prob)          -> ok / confident      -> generates
  * clear domain by margin (lower top)    -> ok / confident      -> generates
  * ambiguous but recognized vocabulary   -> ok / confident      -> generates
  * meaningless input (nothing recognized)-> insufficient_evidence -> clarify
  * recognized words, no class ahead       -> low_confidence      -> clarify

The thresholds themselves are asserted so a future tweak is a conscious change.
"""
from ml.pipeline.classifier import (
    confidence_decision,
    TOP_PROB_FLOOR,
    MARGIN_FLOOR,
    MIN_RECOGNIZED,
    COVERAGE_FLOOR,
    MIN_ANALYZED_FOR_COVERAGE,
    MIN_RECOGNIZED_IN_SCOPE,
)


def test_thresholds_are_the_documented_defaults():
    # Guard: the abstain policy is defined by these numbers. If they move,
    # this test forces the change to be intentional.
    assert TOP_PROB_FLOOR == 0.28
    assert MARGIN_FLOOR == 0.08
    assert MIN_RECOGNIZED == 1
    assert COVERAGE_FLOOR == 0.30
    assert MIN_ANALYZED_FOR_COVERAGE == 12
    assert MIN_RECOGNIZED_IN_SCOPE == 20


def test_clear_domain_high_top_prob_is_ok():
    # e.g. clear travel/food-delivery: top class dominates.
    d = confidence_decision(top_prob=0.93, margin=0.80, recognized=6, analyzed=8)
    assert d == {"decision": "ok", "confident": True}


def test_clear_domain_by_margin_even_when_top_is_modest():
    # e.g. the education@35% case: 35% top with a 14pt lead over the runner-up is
    # a CORRECT, decisive call — margin alone must clear the gate.
    d = confidence_decision(top_prob=0.35, margin=0.14, recognized=4, analyzed=9)
    assert d == {"decision": "ok", "confident": True}


def test_ambiguous_but_recognized_still_generates():
    # recognized vocabulary present and top prob above the floor -> not gated.
    d = confidence_decision(top_prob=0.30, margin=0.05, recognized=3, analyzed=6)
    assert d == {"decision": "ok", "confident": True}


def test_meaningless_input_is_insufficient_evidence():
    # "qwert": zero recognized n-grams -> the probabilities are prior-only noise.
    d = confidence_decision(top_prob=0.27, margin=0.08, recognized=0, analyzed=1)
    assert d == {"decision": "insufficient_evidence", "confident": False}


def test_empty_input_is_insufficient_evidence():
    d = confidence_decision(top_prob=0.0, margin=0.0, recognized=0, analyzed=0)
    assert d == {"decision": "insufficient_evidence", "confident": False}


def test_recognized_words_but_no_class_ahead_is_low_confidence():
    # words recognized, but top prob below floor AND margin below floor.
    d = confidence_decision(top_prob=0.20, margin=0.03, recognized=2, analyzed=10)
    assert d == {"decision": "low_confidence", "confident": False}


def test_boundary_top_prob_exactly_at_floor_is_ok():
    d = confidence_decision(top_prob=TOP_PROB_FLOOR, margin=0.0, recognized=1, analyzed=5)
    assert d["confident"] is True


def test_boundary_margin_exactly_at_floor_is_ok():
    d = confidence_decision(top_prob=0.10, margin=MARGIN_FLOOR, recognized=1, analyzed=5)
    assert d["confident"] is True


def test_out_of_domain_prompt_with_low_coverage_abstains():
    # The reported astronomy bug: a substantial prompt (55 analyzed n-grams) with
    # a confident-looking argmax, but only 11 recognized -> coverage 0.20 < 0.30.
    # top-prob/margin would pass; the coverage guard must abstain instead.
    d = confidence_decision(top_prob=0.45, margin=0.27, recognized=11, analyzed=55)
    assert d == {"decision": "out_of_scope", "confident": False}


def test_out_of_scope_takes_precedence_over_a_strong_argmax():
    # Even a near-certain argmax must not override low coverage on a long prompt.
    d = confidence_decision(top_prob=0.98, margin=0.95, recognized=4, analyzed=30)
    assert d["decision"] == "out_of_scope"
    assert d["confident"] is False


def test_long_in_domain_prompt_with_healthy_coverage_stays_ok():
    # Enough analyzed AND coverage above the floor -> a genuine in-domain prompt.
    d = confidence_decision(top_prob=0.60, margin=0.30, recognized=9, analyzed=14)
    assert d == {"decision": "ok", "confident": True}


def test_coverage_at_floor_is_not_out_of_scope():
    # coverage == COVERAGE_FLOOR is NOT below it -> guard does not fire.
    d = confidence_decision(top_prob=0.40, margin=0.20, recognized=6, analyzed=20)
    assert round(6 / 20, 3) == COVERAGE_FLOOR
    assert d == {"decision": "ok", "confident": True}


def test_short_low_coverage_prompt_is_not_penalized_by_coverage():
    # Below MIN_ANALYZED_FOR_COVERAGE the ratio is unreliable (stopword noise), so
    # a short valid prompt is judged on top-prob/margin, not coverage.
    d = confidence_decision(top_prob=0.50, margin=0.30, recognized=2, analyzed=11)
    assert d == {"decision": "ok", "confident": True}


def test_insufficient_evidence_still_wins_over_out_of_scope():
    # Zero recognized -> insufficient_evidence, regardless of analyzed length.
    d = confidence_decision(top_prob=0.30, margin=0.10, recognized=0, analyzed=40)
    assert d == {"decision": "insufficient_evidence", "confident": False}


# ---------------------------------------------------------------------------
# The verbose-in-domain false positive (the reported "team lunch" bug).
# A long, genuinely in-domain prompt carries a lot of ordinary business English
# outside the fitted vocabulary, so its coverage RATIO drops below the floor even
# though it names MANY real domain terms. The ratio penalizes verbosity; the
# absolute recognized count does not. out_of_scope must require BOTH low coverage
# AND few recognized terms, so a rich in-domain prompt is never abstained.
# ---------------------------------------------------------------------------
def test_verbose_in_domain_prompt_escapes_coverage_by_absolute_recognized():
    # e.g. a food-delivery app for office teams: coverage diluted (0.267 < 0.30)
    # by team/office/split-the-bill jargon, but many domain terms recognized.
    d = confidence_decision(top_prob=0.55, margin=0.30, recognized=24, analyzed=90)
    assert round(24 / 90, 3) < COVERAGE_FLOOR  # ratio alone would have abstained
    assert d == {"decision": "ok", "confident": True}


def test_recognized_just_below_escape_still_abstains():
    # 19 recognized (< MIN_RECOGNIZED_IN_SCOPE) with a low ratio and even a strong
    # argmax must still abstain: thin absolute evidence + diluted coverage = OOD.
    d = confidence_decision(top_prob=0.90, margin=0.80, recognized=19, analyzed=95)
    assert d == {"decision": "out_of_scope", "confident": False}


def test_recognized_at_escape_threshold_is_ok():
    # recognized == MIN_RECOGNIZED_IN_SCOPE is NOT below it -> the escape fires,
    # so a low-coverage prompt with enough absolute evidence is trusted.
    d = confidence_decision(top_prob=0.40, margin=0.10, recognized=20, analyzed=100)
    assert round(20 / 100, 3) < COVERAGE_FLOOR
    assert d == {"decision": "ok", "confident": True}


def test_astronomy_still_abstains_after_the_absolute_escape_added():
    # Regression: the real astronomy datapoint (11 recognized of 55) is BELOW the
    # absolute escape, so adding MIN_RECOGNIZED_IN_SCOPE must not let OOD through.
    d = confidence_decision(top_prob=0.45, margin=0.27, recognized=11, analyzed=55)
    assert d == {"decision": "out_of_scope", "confident": False}


if __name__ == "__main__":
    # Runnable without pytest (VM has no sklearn but this needs none).
    import sys

    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    passed = 0
    failed = []
    for fn in fns:
        try:
            fn()
            passed += 1
        except AssertionError as e:
            failed.append(f"{fn.__name__}: {e}")
    print(f"PASS {passed}  FAIL {len(failed)}")
    for f in failed:
        print("  ✗", f)
    sys.exit(1 if failed else 0)
