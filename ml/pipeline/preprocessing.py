"""
NLP preprocessing stage.

Prefers spaCy (tokenization, lemmatization, noun-chunk + entity extraction).
If spaCy or its model isn't installed, falls back to a dependency-free
tokenizer so the whole system still runs. The `engine` field reports which
path was taken — surfaced in the UI so the demo is honest about what ran.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict
import re

_STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "to", "for", "with", "in", "on", "at",
    "app", "application", "mobile", "that", "which", "where", "users", "user",
    "can", "will", "their", "your", "you", "it", "is", "are", "be", "let",
    "lets", "allow", "allows", "able", "them", "they", "this", "as", "by",
    "create", "build", "make", "want", "need", "should", "using", "use", "via",
}

_TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z\-']+")

# Lightweight lemmatization for the fallback path (plural/verb endings).
def _naive_lemma(word: str) -> str:
    w = word.lower()
    for suf in ("ational", "ing", "ies", "ed", "es", "s"):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            if suf == "ies":
                return w[: -len(suf)] + "y"
            return w[: -len(suf)]
    return w


@dataclass
class PreprocessResult:
    raw: str
    tokens: List[str]           # cleaned, lemmatized, stopword-filtered
    lemmas: List[str]           # all lemmas (incl. stopwords) in order
    noun_phrases: List[str]     # candidate feature/entity phrases
    entities: List[Dict[str, str]]  # [{text, kind}]
    engine: str                 # "spacy:en_core_web_sm" or "fallback"


_NLP = None
_SPACY_TRIED = False


def _get_spacy():
    global _NLP, _SPACY_TRIED
    if _SPACY_TRIED:
        return _NLP
    _SPACY_TRIED = True
    try:
        import spacy  # type: ignore
        try:
            _NLP = spacy.load("en_core_web_sm")
        except Exception:
            # model not downloaded — use a blank pipeline with just a tokenizer
            _NLP = None
    except Exception:
        _NLP = None
    return _NLP


def preprocess(text: str) -> PreprocessResult:
    text = (text or "").strip()
    nlp = _get_spacy()

    if nlp is not None:
        doc = nlp(text)
        lemmas = [t.lemma_.lower() for t in doc if not t.is_space]
        tokens = [
            t.lemma_.lower()
            for t in doc
            if t.is_alpha and not t.is_stop and t.lemma_.lower() not in _STOPWORDS
        ]
        noun_phrases = [nc.text.lower().strip() for nc in doc.noun_chunks]
        entities = [{"text": e.text, "kind": e.label_} for e in doc.ents]
        return PreprocessResult(text, tokens, lemmas, noun_phrases, entities,
                                "spacy:en_core_web_sm")

    # ---- fallback path (no spaCy) ----
    words = _TOKEN_RE.findall(text)
    lemmas = [_naive_lemma(w) for w in words]
    tokens = [lem for lem in lemmas if lem not in _STOPWORDS and len(lem) > 1]
    # crude noun-phrase proxy: adjacent non-stopword bigrams
    noun_phrases = []
    for i in range(len(tokens) - 1):
        noun_phrases.append(f"{tokens[i]} {tokens[i+1]}")
    return PreprocessResult(text, tokens, lemmas, noun_phrases, [], "fallback")


def normalized_text(text: str) -> str:
    """Space-joined lemmas for the classifier's TF-IDF vectorizer."""
    return " ".join(preprocess(text).tokens)


def spacy_doc(text: str):
    """Return the parsed spaCy Doc for `text`, or None if spaCy is unavailable.

    Used by the deeper understanding modules (entity/relationship extraction)
    that need the dependency parse, not just tokens. Returns None gracefully so
    callers fall back to lexical methods offline.
    """
    nlp = _get_spacy()
    if nlp is None:
        return None
    return nlp((text or "").strip())


def spacy_available() -> bool:
    return _get_spacy() is not None
