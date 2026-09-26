"""
Entity extraction.

Domain entities are the "things" an app manages: doctor, appointment, product,
course, workout, restaurant, transaction... We extract them with spaCy
(dependency-aware noun chunks + named entities) rather than a keyword list, so
the system generalises to domains we never enumerated.

Approach:
  * Take spaCy noun chunks, reduce each to its head noun's lemma.
  * Drop generic/meta nouns (app, user, feature, screen, etc.) via a stoplist.
  * Add named entities of useful types.
  * Score by frequency + whether the noun is a grammatical object/subject
    (objects of verbs are usually the real domain entities).
Falls back to noun-phrase heads from the lexical preprocessor when spaCy is
unavailable.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict
from collections import Counter

from .preprocessing import spacy_doc, PreprocessResult

# Nouns that are about the *app itself*, not domain entities.
_META_NOUNS = {
    "app", "application", "user", "users", "customer", "customers", "people",
    "feature", "features", "screen", "screens", "page", "pages", "button",
    "thing", "things", "way", "ways", "system", "platform", "software",
    "someone", "anyone", "everyone", "one", "lot", "kind", "type", "example",
    "tap", "click", "time", "day", "days", "place", "places", "part",
    # pronouns must never become entities
    "it", "them", "they", "this", "that", "these", "those", "him", "her",
}

# A light mapping from a noun to a coarse entity "kind" (best-effort, optional).
_KIND_HINTS = {
    "user": "actor", "customer": "actor", "doctor": "actor", "driver": "actor",
    "seller": "actor", "buyer": "actor", "teacher": "actor", "student": "actor",
    "host": "actor", "trainer": "actor", "creator": "actor", "friend": "actor",
    "appointment": "event", "order": "transaction", "payment": "transaction",
    "transaction": "transaction", "transfer": "transaction", "booking": "transaction",
    "reminder": "notification", "notification": "notification", "message": "message",
    "course": "content", "lesson": "content", "video": "content", "post": "content",
    "workout": "content", "recipe": "content", "article": "content",
    "product": "item", "item": "item", "restaurant": "item", "dish": "item",
    "hotel": "item", "flight": "item", "trip": "item", "account": "item",
    "task": "item", "note": "item", "goal": "item", "habit": "item",
}


@dataclass
class Entity:
    name: str          # lemmatized head noun (singular)
    kind: str          # coarse type hint or "concept"
    confidence: float
    mentions: int


def _classify(noun: str) -> str:
    return _KIND_HINTS.get(noun, "concept")


def extract_entities(text: str, pre: PreprocessResult) -> List[Entity]:
    doc = spacy_doc(text)
    counts: Counter = Counter()
    is_object: Dict[str, bool] = {}

    if doc is not None:
        for chunk in doc.noun_chunks:
            head = chunk.root
            if head.pos_ == "PRON":
                continue
            lemma = head.lemma_.lower().strip()
            if not lemma.isalpha() or len(lemma) < 3 or lemma in _META_NOUNS:
                continue
            counts[lemma] += 1
            # objects/subjects of verbs are usually the real domain entities
            if head.dep_ in ("dobj", "obj", "pobj", "nsubj", "nsubjpass", "attr"):
                is_object[lemma] = True
        # add useful named entities (products, orgs, etc.)
        for ent in doc.ents:
            if ent.label_ in ("PRODUCT", "ORG", "WORK_OF_ART", "EVENT"):
                lemma = ent.root.lemma_.lower().strip()
                if lemma.isalpha() and lemma not in _META_NOUNS:
                    counts[lemma] += 1
    else:
        # lexical fallback: use noun-phrase heads (last token of each phrase)
        for np in pre.noun_phrases:
            head = np.split()[-1]
            if head.isalpha() and len(head) >= 3 and head not in _META_NOUNS:
                counts[head] += 1

    entities: List[Entity] = []
    max_c = max(counts.values()) if counts else 1
    for noun, c in counts.most_common(12):
        conf = 0.5 + 0.3 * (c / max_c) + (0.15 if is_object.get(noun) else 0.0)
        entities.append(Entity(noun, _classify(noun), round(min(conf, 0.97), 3), c))
    return entities
