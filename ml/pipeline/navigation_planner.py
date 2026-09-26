"""
Navigation planning.

Infers the app's navigation structure from the planned screens rather than
hardcoding one layout for every app:

  * bottom navigation  -> the "primary" destinations (when there are >= 2)
  * detail screens     -> item detail views reached from a list
  * modal / linear flow -> checkout/confirmation style step sequences
  * primary CTA        -> the app's main call to action (domain-aware)
  * secondary actions  -> supporting actions

Output is a plain dict that goes into the ApplicationSpecification.
"""
from __future__ import annotations
from typing import List, Dict

from .screen_planner import ScreenPlan

_PRIMARY_CTA = {
    "food-delivery": "Place order",
    "ecommerce": "Buy now",
    "fitness": "Start workout",
    "banking": "Send money",
    "education": "Enroll",
    "social": "Create post",
    "travel": "Book now",
    "productivity": "Add task",
}


def plan_navigation(app_type: str, plans: List[ScreenPlan]) -> Dict:
    primary = [p for p in plans if p.priority == "primary"]
    flow = [p for p in plans if p.priority == "flow"]

    # bottom nav when there are at least two primary destinations
    use_bottom_nav = len(primary) >= 2
    bottom_nav = [p.name for p in primary][:5]

    detail_screens = [p.name for p in plans if p.role in ("details", "detailSecondary")]

    # a linear/modal flow if checkout-style screens exist
    modal_flow: List[str] = []
    flow_roles = [p.role for p in plans]
    if "checkout" in flow_roles:
        seq = [r for r in ("cart", "checkout", "confirmation") if r in flow_roles]
        modal_flow = [next(p.name for p in plans if p.role == r) for r in seq]

    secondary = [p.name for p in plans if p.priority == "secondary"]

    return {
        "pattern": "bottom-tab" if use_bottom_nav else "stack",
        "bottom_nav": bottom_nav if use_bottom_nav else [],
        "detail_screens": detail_screens,
        "modal_flow": modal_flow,
        "primary_cta": _PRIMARY_CTA.get(app_type, "Continue"),
        "secondary_actions": secondary,
    }
