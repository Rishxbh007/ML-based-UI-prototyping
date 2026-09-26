"""
Relationship extraction via spaCy dependency parsing.

Turns a sentence into subject-verb-object style triples that describe how
entities/actions relate, e.g.:

  "users can book appointments with doctors and receive reminders"
    -> (user, book, appointment)
    -> (appointment, with, doctor)      # prepositional attachment
    -> (user, receive, reminder)

This is genuine NLP (dependency parse), not keyword matching. It degrades to an
empty list when spaCy is unavailable (the rest of the spec still builds).
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List

from .preprocessing import spacy_doc

_SUBJ_DEPS = {"nsubj", "nsubjpass"}
_OBJ_DEPS = {"dobj", "obj", "dative", "attr"}

# Pronouns that need coreference resolution to a real antecedent.
_PRONOUNS = {"it", "them", "they", "this", "that", "these", "those", "him", "her", "one", "ones"}

# Targets that carry no real meaning as a relationship endpoint.
_META_TARGETS = {
    "app", "application", "thing", "things", "way", "user", "users", "people",
    "someone", "feature", "features", "something",
} | _PRONOUNS


@dataclass
class Relationship:
    source: str
    relation: str
    target: str
    kind: str  # "svo" (subject-verb-object) or "prep" (prepositional)


def _lemma(tok) -> str:
    return tok.lemma_.lower().strip()


def _find_subject_for(verb_token):
    """Return the subject lemma for a verb, inheriting it across conjunctions.

    In "users browse restaurants, order food and track delivery", only 'browse'
    carries the nsubj; 'order'/'track' are conj verbs sharing that subject.
    We walk up the conj chain to recover it, defaulting to 'user'.
    """
    node = verb_token
    for _ in range(4):  # bounded walk up conj/head chain
        subs = [c for c in node.children if c.dep_ in _SUBJ_DEPS]
        if subs:
            return _lemma(subs[0])
        if node.dep_ == "conj" and node.head is not node:
            node = node.head
        else:
            break
    return "user"


def extract_relationships(text: str) -> List[Relationship]:
    doc = spacy_doc(text)
    if doc is None:
        return []

    rels: List[Relationship] = []
    seen = set()

    def add(src: str, rel: str, tgt: str, kind: str):
        if not (src and tgt) or not src.isalpha() or not tgt.isalpha():
            return
        if tgt in _META_TARGETS or len(tgt) < 3:
            return
        key = (src, rel, tgt)
        if key in seen or src == tgt:
            return
        seen.add(key)
        rels.append(Relationship(src, rel, tgt, kind))

    # Track the most recent concrete object noun so pronouns (them/it/…) can be
    # resolved to their antecedent (simple but effective coreference).
    last_entity = {"lemma": None}

    def resolve(tok) -> str:
        lemma = _lemma(tok)
        if tok.pos_ == "PRON" or lemma in _PRONOUNS:
            return last_entity["lemma"] or ""  # empty -> add() will skip it
        # remember concrete nouns as potential antecedents
        if lemma.isalpha() and lemma not in _META_TARGETS:
            last_entity["lemma"] = lemma
        return lemma

    for token in doc:
        if token.pos_ != "VERB":
            continue
        verb = _lemma(token)
        subject = _find_subject_for(token)  # inherits across conjunctions
        objects = [c for c in token.children if c.dep_ in _OBJ_DEPS]

        # subject -> verb -> object (with pronoun resolution on the object)
        resolved_objs = [resolve(o) for o in objects]
        for tgt in resolved_objs:
            add(subject, verb, tgt, "svo")

        # phrasal / prepositional: "pay for a booking", "connect with friends"
        for child in token.children:
            if child.dep_ == "prep":
                for pobj in child.children:
                    if pobj.dep_ == "pobj":
                        tgt = resolve(pobj)
                        if resolved_objs and resolved_objs[0]:
                            # object relates to pobj: appointment --with--> doctor
                            add(resolved_objs[0], child.text.lower(), tgt, "prep")
                        else:
                            # verb+prep acts as the relation: user --pay for--> booking
                            add(subject, f"{verb} {child.text.lower()}", tgt, "svo")

    return rels[:14]
