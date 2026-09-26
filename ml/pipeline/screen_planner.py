"""
Requirement-driven screen planning.

Unlike the old planner (which always assumed splash -> login -> dashboard ->
profile), screens here are DERIVED from the detected features, entities, goals
and authentication needs:

  * auth screens (login/signup) appear ONLY when authentication is required.
  * the primary landing is home vs dashboard depending on the domain.
  * search/list/details/cart/checkout/messaging screens appear only when the
    corresponding features/entities are present.

Every screen keeps a valid renderer `role` (so the existing prototype renderer
works unchanged) plus a domain-appropriate `name`, a `purpose`, a `priority`
and the `source` reason it was included — which is what makes the inference
explainable in the viva.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import List, Dict, Set

from .understanding import Understanding
from .entities import Entity

# Domain-specific display names for standard roles (so plans read naturally).
_DOMAIN_NAMES: Dict[str, Dict[str, str]] = {
    "food-delivery": {"home": "Home", "search": "Search", "list": "Restaurants", "details": "Restaurant", "cart": "Cart", "checkout": "Checkout", "confirmation": "Order Placed", "dashboard": "Home"},
    "ecommerce": {"list": "Products", "details": "Product", "cart": "Cart", "checkout": "Checkout", "confirmation": "Order Placed"},
    "fitness": {"dashboard": "Home", "list": "Workouts", "details": "Workout", "confirmation": "Done"},
    "banking": {"dashboard": "Home", "list": "Transactions", "details": "Transfer", "checkout": "Send", "confirmation": "Sent"},
    "education": {"home": "Learn", "list": "Courses", "details": "Course", "dashboard": "Learn"},
    "social": {"home": "Feed", "list": "Explore", "details": "Post", "detailSecondary": "Chat"},
    "travel": {"home": "Explore", "list": "Results", "details": "Stay", "checkout": "Booking", "confirmation": "Booked"},
    "productivity": {"dashboard": "Today", "list": "Tasks", "details": "Task"},
}

# Which domains use a feed-style "home" vs a stats-style "dashboard" landing.
_DASHBOARD_DOMAINS = {"fitness", "banking", "productivity"}

# Standard render order.
_ORDER = [
    "splash", "onboarding", "login", "signup", "home", "dashboard",
    "search", "list", "details", "detailSecondary", "cart", "checkout",
    "confirmation", "profile", "settings",
]

_ENTITY_IMPLIES_LIST = {
    "product", "restaurant", "dish", "course", "lesson", "workout", "hotel",
    "flight", "trip", "task", "note", "transaction", "order", "post", "recipe",
    "class", "item", "stay", "listing", "video",
}


@dataclass
class ScreenPlan:
    role: str
    name: str
    purpose: str
    priority: str   # "primary" (bottom-nav destination) | "secondary" | "flow"
    source: str


def _name_for(app_type: str, role: str, default: str) -> str:
    return _DOMAIN_NAMES.get(app_type, {}).get(role, default)


def plan_screens(
    app_type: str,
    features: List[Dict],
    entities: List[Entity],
    understanding: Understanding,
) -> List[ScreenPlan]:
    feat = {f["name"] for f in features}
    entity_names = {e.name for e in entities}
    picked: Dict[str, ScreenPlan] = {}

    def add(role: str, default_name: str, purpose: str, priority: str, source: str):
        if role not in picked:
            picked[role] = ScreenPlan(role, _name_for(app_type, role, default_name), purpose, priority, source)

    auth = understanding.authentication.get("required", False)

    # --- authentication screens: only when actually implied ---------------
    if auth:
        add("login", "Login", "Authenticate returning users.", "flow",
            "authentication was detected in the requirement")
        add("signup", "Sign Up", "Register new users.", "flow",
            "account creation follows from authentication")

    # --- primary landing --------------------------------------------------
    if app_type in _DASHBOARD_DOMAINS:
        add("dashboard", "Home", "Overview / summary the user lands on.", "primary",
            f"{app_type} apps center on a stats/overview home")
    else:
        add("home", "Home", "Main hub the user lands on.", "primary",
            f"{app_type} apps center on a browsable home")

    # --- feature-driven screens -------------------------------------------
    if "search" in feat:
        add("search", "Search", "Find items across the app.", "primary",
            "a search/discovery feature was detected")

    if feat & {"listing", "content", "booking"} or (entity_names & _ENTITY_IMPLIES_LIST):
        reason = "a listing/catalog feature was detected" if "listing" in feat else \
                 f"entities imply a browsable list ({', '.join(sorted(entity_names & _ENTITY_IMPLIES_LIST))[:40]})"
        add("list", "Browse", "Browse the app's core items.", "primary", reason)

    if feat & {"details", "listing", "content", "booking"} or (entity_names & _ENTITY_IMPLIES_LIST):
        add("details", "Details", "View a single item in detail.", "flow",
            "users need to open an item's detail view")

    if "messaging" in feat:
        add("detailSecondary", "Messages", "Conversation / messaging screen.", "flow",
            "a messaging feature was detected")

    if "cart" in feat:
        add("cart", "Cart", "Review selected items before ordering.", "flow",
            "a cart/basket feature was detected")

    # Payments/checkout screens ONLY when money is actually involved — NOT for
    # plain booking (an appointment app should not get an ecommerce checkout).
    has_payments = bool(feat & {"checkout", "payments"}) or "cart" in feat
    has_booking = "booking" in feat

    if has_payments:
        label = "Send" if app_type == "banking" else "Checkout"
        add("checkout", label, "Complete the purchase/transfer.", "flow",
            "a checkout/payment feature was detected")
        add("confirmation", "Confirmed", "Confirm a successful transaction.", "flow",
            "a successful payment needs confirmation")
    elif has_booking:
        # booking without payment -> a reservation confirmation, no cart/checkout
        add("confirmation", "Booked", "Confirm a successful booking.", "flow",
            "a booking feature needs a confirmation screen (no payment detected)")

    # --- profile / settings: only when actually supported ----------------
    profile_supported = auth or ("profile" in feat) or app_type == "social" \
        or ("profile" in entity_names) or ("account" in entity_names)
    if profile_supported:
        add("profile", "Profile", "User's profile and account.", "primary",
            "authentication / profile references support a profile screen")

    # settings only when constraints/preferences are actually mentioned
    if understanding.constraints:
        add("settings", "Settings", "App preferences and configuration.", "secondary",
            "constraints/preferences imply a settings screen")

    # NOTE: we deliberately do NOT auto-add a splash screen. Generic screens
    # (splash/login/signup/profile/settings/checkout) are only included when the
    # requirement actually supports them — that is the whole point of the
    # requirement-driven planner.

    ordered = sorted(picked.values(), key=lambda s: _ORDER.index(s.role) if s.role in _ORDER else 999)
    return ordered


def plan_to_inferred_screens(plans: List[ScreenPlan]) -> List[Dict[str, str]]:
    """Back-compat shape for `/api/analyze` -> inferredScreens (role + reason).

    Includes the richer name/priority as extra fields (ignored by the current
    renderer, available for future use).
    """
    return [
        {"role": p.role, "reason": p.source, "name": p.name, "priority": p.priority}
        for p in plans
    ]
