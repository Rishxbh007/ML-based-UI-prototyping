"""
App-type (domain) classifier — the trained ML core of the project.

This is a genuine supervised text classifier: TF-IDF features over lemmatized
text feed one of several candidate models. The training script
(`ml/training/train.py`) compares the candidates on a held-out split and
persists the BEST one — the choice is measured, not assumed.

Candidate models (all lightweight, CPU-only, interpretable):
  * logreg : TF-IDF + Logistic Regression (multinomial) — strong linear baseline.
  * svm    : TF-IDF + Linear SVM (LinearSVC), calibrated so it can output
             probabilities for the confidence bars.
  * nb     : TF-IDF + Complement Naive Bayes — robust on small text corpora.

At inference the model returns a predicted label AND a full probability
distribution, which the UI shows as confidence bars (making the ML visible).

Why these models (viva answer): for short-text classification with a few
hundred balanced samples, linear models over TF-IDF are the right tool — fast,
no GPU, and interpretable (you can inspect per-class weights). A deep model or
LLM would overfit this data and turn a defensible classifier into a black box.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Tuple
import os

from .preprocessing import normalized_text

# sklearn / joblib are imported lazily inside methods so that the graceful
# fallback path (no trained model) does not require sklearn to be installed.

_MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
_MODEL_PATH = os.path.join(_MODEL_DIR, "app_type_clf.joblib")

# Candidate model identifiers the training script can compare.
MODEL_CHOICES = ("logreg", "svm", "nb")

# ---------------------------------------------------------------------------
# Confidence / uncertainty policy.
#
# predict_proba ALWAYS returns a full distribution over the trained classes, so
# on its own it can never say "I don't know" — an all-out-of-vocabulary input
# like "qwert" still gets a confident-looking argmax driven purely by the
# model's class priors (intercepts). We therefore separate two things the old
# pipeline conflated:
#   * EVIDENCE  — how much of the input the model actually recognized (share of
#     analyzed n-grams that are in the fitted TF-IDF vocabulary). Zero evidence
#     means the distribution is prior-only and must not be trusted.
#   * DECISION  — whether the top class is meaningfully ahead: either a high
#     enough top probability OR a clear margin over the runner-up.
#
# These thresholds are defensible defaults for an 8-class problem (a uniform
# guess is 0.125), NOT values tuned to make any particular input look confident.
# No probability is ever modified — this layer only classifies the decision.
# ---------------------------------------------------------------------------
TOP_PROB_FLOOR = 0.28   # top class ~2.2x a uniform guess
MARGIN_FLOOR = 0.08     # or a clear lead over the runner-up
MIN_RECOGNIZED = 1      # at least one recognized n-gram = some evidence

# Out-of-scope guard. The 8 trained classes cover a fixed set of app domains;
# a prompt from an UNSUPPORTED domain (e.g. an astronomy / stargazing app) has
# no class of its own, so softmax spreads over the known classes and generic
# verbs ("plan", "track", "save", "discover") can hand one class a confident-
# looking argmax with a wide margin, even though the model recognized almost
# none of the input. top-prob/margin alone cannot catch this (they only measure
# the SHAPE of the distribution, not whether the input is in-domain). COVERAGE
# does: when a substantial prompt is analyzed but only a small share of its
# n-grams are in the fitted vocabulary, the input is largely foreign and the
# prediction must NOT be trusted -- we abstain honestly instead of rendering a
# wrong prototype with false confidence.
#
# The MIN_ANALYZED gate keeps this from penalizing short but valid prompts
# ("track my workouts"), where a couple of stopwords would otherwise drag the
# ratio down; coverage is only a reliable OOV signal once enough n-grams exist.
#
# The MIN_RECOGNIZED_IN_SCOPE gate is the second half of the guard, and the fix
# for the opposite failure: a LONG, verbose, but genuinely in-domain prompt (e.g.
# "a food-delivery app for office employees ordering team lunches -- create a
# group, invite coworkers, split the bill, set a delivery deadline...") carries a
# lot of ordinary business English that isn't in the vocabulary, so its coverage
# RATIO is diluted below the floor even though it names many real domain terms.
# The coverage ratio penalizes verbosity; absolute recognized count does not. A
# truly foreign prompt (astronomy) recognizes only a HANDFUL of terms in absolute;
# a diluted in-domain prompt recognizes MANY. So we only abstain when coverage is
# low AND the absolute number of recognized n-grams is itself small. This keeps
# out-of-domain prompts caught while never rejecting a rich in-domain description.
#
# NOTE (tuning): COVERAGE_FLOOR and MIN_RECOGNIZED_IN_SCOPE are defensible
# defaults, NOT tuned against the live sklearn model (it cannot be trained/loaded
# in this sandbox). The real data points available on the trained model: the
# astronomy OOD prompt measured coverage 0.20 with 11 recognized n-grams (11/55);
# a clean in-domain food-delivery prompt measured 42/65. MIN_RECOGNIZED_IN_SCOPE
# is set ABOVE the astronomy figure (so astronomy stays caught) yet well below the
# in-domain figure, so a verbose in-domain prompt escapes dilution. Validate on
# Windows against the trained model + the seed example prompts before shipping,
# adjusting these constants if any legitimate in-domain prompt is still flagged.
COVERAGE_FLOOR = 0.30            # < this share of recognized n-grams = out of scope
MIN_ANALYZED_FOR_COVERAGE = 12   # only judge coverage once the prompt is long enough
MIN_RECOGNIZED_IN_SCOPE = 20     # >= this many recognized n-grams = trust it, don't abstain

# PARITY: `frontend/src/lib/localAnalysis.ts` mirrors this exact decision logic
# for the offline fallback. The branch STRUCTURE must stay identical on both
# sides; the constant VALUES intentionally differ because the denominators do --
# this side counts TF-IDF n-grams (no stopwords); the frontend counts keyword-
# vocab tokens over a set that includes stopwords, so its coverage runs lower and
# its recognized counts are smaller (floor 0.18, min-analyzed 8, in-scope 5).
# Both sides are pinned by threshold tests so any change must be deliberate.


@dataclass
class Prediction:
    label: str
    confidence: float
    probabilities: List[Tuple[str, float]]  # sorted desc
    # evidence: how much of the input the trained model actually recognized.
    recognized: int = 0   # analyzed n-grams present in the TF-IDF vocabulary
    analyzed: int = 0     # total analyzed n-grams
    coverage: float = 0.0  # recognized / analyzed (0.0 when analyzed == 0)


def confidence_decision(
    top_prob: float, margin: float, recognized: int, analyzed: int
) -> dict:
    """Classify the reliability of a prediction WITHOUT changing any number.

    Returns {decision, confident} where decision is one of:
      * "insufficient_evidence" -- the model recognized (almost) none of the
        input, so the probabilities are prior-only noise (e.g. "qwert").
      * "out_of_scope" -- enough of the input was analyzed to judge it, but only
        a small share is in the fitted vocabulary AND only a few terms are
        recognized in absolute: the prompt describes a domain outside the trained
        app types, so its confident-looking argmax is not trustworthy (e.g. an
        astronomy app scored as fitness). A verbose but in-domain prompt has a
        diluted coverage ratio yet many recognized terms, so it is NOT abstained.
      * "low_confidence" -- words were recognized but no class is clearly ahead.
      * "ok" -- a class is confidently or clearly the primary domain.
    """
    if analyzed <= 0 or recognized < MIN_RECOGNIZED:
        return {"decision": "insufficient_evidence", "confident": False}
    coverage = recognized / analyzed if analyzed else 0.0
    if (
        analyzed >= MIN_ANALYZED_FOR_COVERAGE
        and coverage < COVERAGE_FLOOR
        and recognized < MIN_RECOGNIZED_IN_SCOPE
    ):
        return {"decision": "out_of_scope", "confident": False}
    if top_prob >= TOP_PROB_FLOOR or margin >= MARGIN_FLOOR:
        return {"decision": "ok", "confident": True}
    return {"decision": "low_confidence", "confident": False}


def _measure_evidence(pipeline, text: str) -> Tuple[int, int]:
    """(recognized, analyzed) n-grams for `text` against the fitted vocabulary.

    Uses the vectorizer's OWN analyzer (same preprocessing + n-gram range used
    at training) so the count reflects exactly what the model can see.
    """
    try:
        tfidf = pipeline.named_steps["tfidf"]
        analyzer = tfidf.build_analyzer()
        grams = analyzer(text)
        vocab = tfidf.vocabulary_
        recognized = sum(1 for g in grams if g in vocab)
        return recognized, len(grams)
    except Exception:
        # Never let evidence measurement break prediction.
        return 0, 0


def _build_vectorizer():
    from sklearn.feature_extraction.text import TfidfVectorizer
    return TfidfVectorizer(
        preprocessor=normalized_text,  # our NLP stage feeds the vectorizer
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True,
    )


def build_pipeline(model: str = "logreg"):
    """Construct an (untrained) classifier pipeline for the given model id.

    All variants expose predict_proba (LinearSVC is wrapped in a calibrator),
    so the rest of the system can treat them uniformly.
    """
    from sklearn.pipeline import Pipeline

    if model == "logreg":
        from sklearn.linear_model import LogisticRegression
        clf = LogisticRegression(max_iter=2000, C=6.0, class_weight="balanced")
    elif model == "svm":
        from sklearn.svm import LinearSVC
        from sklearn.calibration import CalibratedClassifierCV
        # Calibrate so LinearSVC can produce probabilities for confidence bars.
        base = LinearSVC(C=1.0, class_weight="balanced")
        clf = CalibratedClassifierCV(base, cv=3)
    elif model == "nb":
        from sklearn.naive_bayes import ComplementNB
        clf = ComplementNB()
    else:
        raise ValueError(f"Unknown model '{model}'. Choose from {MODEL_CHOICES}.")

    return Pipeline([("tfidf", _build_vectorizer()), ("clf", clf)])


class AppTypeClassifier:
    def __init__(self, pipeline=None):
        self.pipeline = pipeline

    # ---- persistence ----
    def save(self, path: str = _MODEL_PATH) -> str:
        import joblib
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump(self.pipeline, path)
        return path

    @classmethod
    def load(cls, path: str = _MODEL_PATH) -> "AppTypeClassifier":
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"Model not found at {path}. Train it first: python -m ml.training.train"
            )
        import joblib
        return cls(joblib.load(path))

    @classmethod
    def is_trained(cls, path: str = _MODEL_PATH) -> bool:
        return os.path.exists(path)

    # ---- inference ----
    def predict(self, text: str) -> Prediction:
        if self.pipeline is None:
            raise RuntimeError("Classifier has no pipeline (train or load first).")
        proba = self.pipeline.predict_proba([text])[0]
        classes = list(self.pipeline.named_steps["clf"].classes_)
        pairs = sorted(zip(classes, (float(p) for p in proba)),
                       key=lambda x: x[1], reverse=True)
        recognized, analyzed = _measure_evidence(self.pipeline, text)
        coverage = round(recognized / analyzed, 3) if analyzed else 0.0
        return Prediction(pairs[0][0], pairs[0][1], pairs,
                          recognized=recognized, analyzed=analyzed, coverage=coverage)
