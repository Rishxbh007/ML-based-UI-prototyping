"""
Held-out evaluation set — requirements NOT used for training.

Every sentence here is written to be DISTINCT from the training corpus
(`ml/data/dataset.py` + `dataset_advanced.py`) so there is no leakage: the
patterns are trained, but these exact sentences are unseen.

Each item: text, expected PRIMARY domain label, and a difficulty tag:
  simple / standard / multi / long        — classification difficulty
  ambiguous / multi_domain                 — primary-vs-capability reasoning
  pronoun                                   — coreference resolution
  multi_action                              — several coordinated goals
  marketplace / notification / implicit     — specific understanding challenges

`label` is the most defensible PRIMARY purpose; on multi_domain items a
capability from another domain is expected but must NOT flip the label.
"""
from __future__ import annotations
from typing import List, Dict

EVAL: List[Dict[str, str]] = [
    # ---- simple ----
    {"text": "app to order dinner from nearby diners", "label": "food-delivery", "difficulty": "simple"},
    {"text": "log my gym sessions", "label": "fitness", "difficulty": "simple"},
    {"text": "check my account balance", "label": "banking", "difficulty": "simple"},
    {"text": "buy sneakers online", "label": "ecommerce", "difficulty": "simple"},
    {"text": "learn french", "label": "education", "difficulty": "simple"},
    {"text": "share pictures with my followers", "label": "social", "difficulty": "simple"},
    {"text": "reserve a hotel room", "label": "travel", "difficulty": "simple"},
    {"text": "keep a daily task list", "label": "productivity", "difficulty": "simple"},

    # ---- standard ----
    {"text": "an app where people find cafes and order coffee for pickup", "label": "food-delivery", "difficulty": "standard"},
    {"text": "an app that records my cycling distance and shows weekly stats", "label": "fitness", "difficulty": "standard"},
    {"text": "an app to view balances and pay my utility bills", "label": "banking", "difficulty": "standard"},
    {"text": "an app to browse headphones with ratings and purchase them", "label": "ecommerce", "difficulty": "standard"},
    {"text": "an app for pupils to watch recorded classes and attempt tests", "label": "education", "difficulty": "standard"},
    {"text": "an app to publish reels and follow other creators", "label": "social", "difficulty": "standard"},
    {"text": "an app to compare airfares and reserve seats", "label": "travel", "difficulty": "standard"},
    {"text": "an app to jot ideas and sort them into notebooks", "label": "productivity", "difficulty": "standard"},

    # ---- multi-feature (single domain) ----
    {"text": "a diner app with menu search, favourites, live courier tracking and reordering", "label": "food-delivery", "difficulty": "multi"},
    {"text": "a training app with plans, rep logging, step sync and monthly stats", "label": "fitness", "difficulty": "multi"},
    {"text": "a finance app with fund transfers, bill pay, card controls and budgets", "label": "banking", "difficulty": "multi"},
    {"text": "a store app with filters, wishlist, cart, coupons and order tracking", "label": "ecommerce", "difficulty": "multi"},
    {"text": "a study app with lessons, graded tests, assignments and completion badges", "label": "education", "difficulty": "multi"},

    # ---- multi_action (coordinated verbs / multiple goals) ----
    {"text": "look through restaurants, order a meal, follow the delivery and rate the place", "label": "food-delivery", "difficulty": "multi_action"},
    {"text": "search hostels, compare prices, reserve a bed and review the stay", "label": "travel", "difficulty": "multi_action"},
    {"text": "pick a workout, start the timer, log the sets and check progress", "label": "fitness", "difficulty": "multi_action"},

    # ---- pronoun / coreference ----
    {"text": "browse phones and add them to a cart", "label": "ecommerce", "difficulty": "pronoun"},
    {"text": "find courses and enroll in them", "label": "education", "difficulty": "pronoun"},
    {"text": "pick recipes and save them to a collection", "label": "productivity", "difficulty": "pronoun"},

    # ---- marketplace ----
    {"text": "a store where instructors sell classes that learners can purchase and rate", "label": "ecommerce", "difficulty": "marketplace"},
    {"text": "a platform to list and buy handmade crafts with seller reviews", "label": "ecommerce", "difficulty": "marketplace"},

    # ---- notification / reminders ----
    {"text": "an app to schedule dentist visits and be notified a day before", "label": "productivity", "difficulty": "notification"},
    {"text": "an app to set medication reminders and track doses", "label": "productivity", "difficulty": "notification"},

    # ---- implicit intent ----
    {"text": "a place to keep track of what I spend each week", "label": "banking", "difficulty": "implicit"},
    {"text": "somewhere to keep all my travel plans in one place", "label": "travel", "difficulty": "implicit"},

    # ---- long ----
    {"text": "an app for busy professionals to discover healthy eateries nearby, filter by diet, build a basket across places, schedule lunch delivery and reorder their usual quickly", "label": "food-delivery", "difficulty": "long"},
    {"text": "a pocket coach that assesses your level, generates a weekly plan, guides each exercise, logs sets and calories, syncs a wearable and charts progress over months", "label": "fitness", "difficulty": "long"},

    # ---- ambiguous / multi_domain (primary must survive a capability) ----
    {"text": "reserve a pilates session and pay the drop-in fee", "label": "fitness", "difficulty": "multi_domain"},
    {"text": "buy groceries for the flat and settle up with housemates", "label": "food-delivery", "difficulty": "multi_domain"},
    {"text": "organize a weekend getaway with mates and post pictures along the way", "label": "travel", "difficulty": "multi_domain"},
    {"text": "enroll in a paid bootcamp and discuss lessons with classmates", "label": "education", "difficulty": "multi_domain"},
    {"text": "order dinner and split the cost with a friend", "label": "food-delivery", "difficulty": "multi_domain"},
    {"text": "book a haircut and pay in the app", "label": "productivity", "difficulty": "ambiguous"},
]


def load_eval() -> List[Dict[str, str]]:
    return EVAL
