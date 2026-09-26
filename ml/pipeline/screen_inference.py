"""
Screen inference stage.

Maps the app type + extracted features to the set of screens the app needs.
This bridges ML output -> the deterministic generation engine.

It is rule-based ON PURPOSE (and we say so in the report): given the analyzed
features, the required screens are deterministic, so the generated app is
always coherent and never missing a screen its navigation references.
"""
from __future__ import annotations
from typing import List, Dict, Tuple

# Screens every app gets.
BASE_SCREENS: List[Tuple[str, str]] = [
    ("splash", "Every app opens with a brief branded splash."),
    ("login", "Authentication was detected / assumed for a mobile app."),
]

# feature -> screens it implies (role, reason)
FEATURE_SCREENS: Dict[str, List[Tuple[str, str]]] = {
    "authentication": [("signup", "Sign-up follows from account/authentication features.")],
    "search": [("search", "A search/discovery feature was detected.")],
    "listing": [("list", "A catalog/feed/listing feature was detected.")],
    "details": [("details", "Users view item/content details.")],
    "cart": [("cart", "A cart/basket feature was detected.")],
    "checkout": [("checkout", "A checkout/order/payment feature was detected."),
                 ("confirmation", "Successful checkout needs a confirmation screen.")],
    "payments": [("checkout", "A payment/transfer feature was detected.")],
    "tracking": [("dashboard", "A tracking/progress feature implies a dashboard.")],
    "dashboard": [("dashboard", "A dashboard/overview feature was detected.")],
    "content": [("details", "Content (lessons/workouts/videos) needs a detail screen.")],
    "booking": [("details", "Booking needs an item detail screen."),
                ("checkout", "Booking needs a reserve/pay screen.")],
    "profile": [("profile", "A profile feature was detected.")],
    "social": [("home", "A social feed acts as the home screen.")],
    "messaging": [("detailSecondary", "Messaging needs a conversation screen.")],
}

# App-type defaults ensure a sensible home even if features are sparse.
APPTYPE_HINTS: Dict[str, List[Tuple[str, str]]] = {
    "food-delivery": [("home", "Home hub for a food-delivery app."), ("list", "Restaurant list."), ("details", "Restaurant/dish details."), ("cart", "Cart."), ("checkout", "Checkout."), ("confirmation", "Order confirmation.")],
    "ecommerce": [("home", "Storefront home."), ("list", "Product list."), ("details", "Product details."), ("cart", "Cart."), ("checkout", "Checkout."), ("confirmation", "Order confirmation.")],
    "fitness": [("dashboard", "Fitness dashboard."), ("details", "Workout detail."), ("profile", "Profile & goals.")],
    "banking": [("dashboard", "Accounts dashboard."), ("details", "Transaction/transfer detail."), ("profile", "Profile & settings.")],
    "education": [("home", "Courses home."), ("list", "Course list."), ("details", "Course/lesson detail."), ("profile", "Learning profile.")],
    "social": [("home", "Feed home."), ("details", "Post detail."), ("profile", "User profile.")],
    "travel": [("home", "Explore home."), ("list", "Results list."), ("details", "Stay/flight detail."), ("checkout", "Booking & pay."), ("confirmation", "Booking confirmed.")],
    "productivity": [("dashboard", "Task dashboard."), ("details", "Task/note detail."), ("profile", "Profile & settings.")],
}

# Canonical ordering so flows read naturally.
SCREEN_ORDER = [
    "splash", "onboarding", "login", "signup", "home", "dashboard",
    "search", "list", "details", "detailSecondary", "cart", "checkout",
    "confirmation", "profile", "settings",
]


def infer_screens(app_type: str, feature_names: List[str]) -> List[Dict[str, str]]:
    picked: Dict[str, str] = {}

    def add(role: str, reason: str):
        if role not in picked:
            picked[role] = reason

    for role, reason in BASE_SCREENS:
        add(role, reason)

    for f in feature_names:
        for role, reason in FEATURE_SCREENS.get(f, []):
            add(role, reason)

    # ensure a home/dashboard exists
    if "home" not in picked and "dashboard" not in picked:
        add("home", "Primary landing screen for the app.")

    # enrich with app-type defaults (fills gaps, doesn't override reasons)
    for role, reason in APPTYPE_HINTS.get(app_type, []):
        add(role, reason)

    # always give the user a profile to make the app feel complete
    add("profile", "Standard profile/account screen.")

    ordered = sorted(picked.items(), key=lambda kv: SCREEN_ORDER.index(kv[0]) if kv[0] in SCREEN_ORDER else 999)
    return [{"role": role, "reason": reason} for role, reason in ordered]
