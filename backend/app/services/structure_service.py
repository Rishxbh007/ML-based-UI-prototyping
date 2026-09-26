"""
Per-request STRUCTURE suggestion — Phase 2's "LLM-assisted structure" tier.

Honest division of labor (the viva answer for "what does the LLM decide now?"):
  * The classifier still decides the DOMAIN. The deterministic engine still
    owns LAYOUT, COMPONENTS, the RENDERER and — crucially — remains the source
    of truth: it supplies a baseline screen selection and validates/repairs
    whatever the LLM proposes, and it is the COMPLETE offline fallback.
  * The LLM (optional) only REASONS about which screens the described app needs,
    in what order, and which belong to the primary (bottom) navigation — chosen
    strictly from the fixed screen-role vocabulary the frontend passes in. It
    never invents a new role and never touches layout/components.
  * With no API key (or any failure) this returns structure=None, so the
    frontend keeps using its deterministic requirement-driven selection. The
    product stays fully offline-capable — no LLM dependency at runtime.

This deliberately REUSES the Phase-1 resilience layer in content_service
(provider chain + bounded retry + categorized staged errors + secret scrub) so
there is a single, tested implementation of "call the LLM safely" — only the
prompt and the parse/validate step differ here.
"""
from __future__ import annotations
import json
import logging
from typing import List, Optional

from app.core.config import get_settings
from app.schemas.project import GenerateStructureRequest, GenerateStructureResponse, StructurePlanModel

# Reuse the Phase-1 LLM plumbing verbatim (no second implementation, no new SDK).
from app.services.content_service import (
    _ADVANCE_STAGES,
    _LLMStageError,
    _call_provider,
    _extract_json,
    _provider_chain,
    _scrub,
)

logger = logging.getLogger("morph")


def generate_structure(req: GenerateStructureRequest) -> GenerateStructureResponse:
    """Try the configured LLM to propose a screen structure; else signal a
    fallback. Never raises: any problem degrades to source="fallback" with
    structure=None, which tells the frontend to use its deterministic selection.
    """
    settings = get_settings()
    if not settings.llm_enabled:
        logger.info("structure: LLM disabled (provider=%r) -> deterministic selection",
                    settings.llm_provider)
        return GenerateStructureResponse(
            structure=None, source="fallback",
            note="LLM disabled — using the deterministic screen selection.",
        )
    try:
        logger.info("structure: calling %s via %s for app_type=%s",
                    settings.llm_model, settings.llm_provider, req.app_type)
        plan = _generate_with_llm(req, settings)
        if plan is not None:
            logger.info("structure: LLM proposed %d screens for app_type=%s",
                        len(plan.roles), req.app_type)
            return GenerateStructureResponse(structure=plan, source="llm",
                                             note="Structure proposed for this request.")
        logger.warning("structure: LLM returned no usable plan -> deterministic selection")
        reason = "no usable structure"
    except _LLMStageError as se:
        reason = _scrub(str(se), settings.llm_api_key)
        logger.warning("structure: LLM failed %s -> deterministic selection", reason)
    except Exception as exc:  # never breaks generation
        reason = _scrub(f"[unknown] {type(exc).__name__}: {exc}", settings.llm_api_key)
        logger.warning("structure: LLM failed %s -> deterministic selection", reason)
    return GenerateStructureResponse(
        structure=None, source="fallback",
        note=f"LLM unavailable ({reason}) — using the deterministic screen selection.",
    )


def _generate_with_llm(req: GenerateStructureRequest, settings) -> Optional[StructurePlanModel]:
    """Try each configured LLM in order (reusing the Phase-1 provider chain);
    first success wins. A malformed payload is terminal (not a capacity miss),
    so it is never retried across providers. If every provider is unavailable
    the last categorized error is raised → deterministic fallback."""
    system = _build_system_prompt(req)
    user = _build_user_prompt(req)

    chain = _provider_chain(settings)
    if not chain:
        return None

    last_error: Optional[_LLMStageError] = None
    for idx, (provider, api_key, model) in enumerate(chain, start=1):
        try:
            text = _call_provider(provider, api_key, model, system, user)
        except _LLMStageError as se:
            last_error = se
            if se.stage in _ADVANCE_STAGES and idx < len(chain):
                logger.warning("structure: attempt %d/%d (%s/%s) unavailable at %s -> next provider",
                               idx, len(chain), provider, model, se.stage)
                continue
            raise
        try:
            data = json.loads(_extract_json(text))
        except Exception as e:
            raise _LLMStageError("json-parse", e)
        try:
            return _coerce(data, req)
        except Exception as e:
            raise _LLMStageError("schema", e)

    if last_error is not None:
        raise last_error
    return None


def _coerce(data: dict, req: GenerateStructureRequest) -> StructurePlanModel:
    """Validate + constrain the LLM payload to the passed role vocabulary.

    This is the guard that keeps the deterministic engine authoritative:
      * only roles in `allowed_roles` survive (unknown/invented roles dropped);
      * order is preserved but de-duplicated;
      * `primary` is intersected with the surviving roles;
      * an empty result raises → deterministic fallback (never an empty app).
    Layout/components/navigation repair are still done entirely downstream by
    the deterministic engine — the LLM only picks the role SET here.
    """
    allowed = [r for r in req.allowed_roles if isinstance(r, str)]
    allowed_set = set(allowed)

    raw_roles = data.get("roles") or []
    roles: List[str] = []
    for r in raw_roles:
        if isinstance(r, str) and r in allowed_set and r not in roles:
            roles.append(r)
    if not roles:
        raise ValueError("no valid roles in LLM structure (after vocabulary filter)")

    raw_primary = data.get("primary") or []
    role_set = set(roles)
    primary: List[str] = []
    for r in raw_primary:
        if isinstance(r, str) and r in role_set and r not in primary:
            primary.append(r)

    rationale = data.get("rationale")
    rationale = rationale.strip()[:400] if isinstance(rationale, str) else ""

    return StructurePlanModel(roles=roles, primary=primary, rationale=rationale)


def _build_system_prompt(req: GenerateStructureRequest) -> str:
    vocab = ", ".join(req.allowed_roles) if req.allowed_roles else "(none provided)"
    return (
        "You are a senior product designer deciding the SCREEN STRUCTURE of a "
        f"mobile app of type '{req.app_type}'. Decide which screens the app "
        "described below genuinely needs, the order the user moves through them, "
        "and which screens belong in the bottom navigation bar.\n\n"
        "You MUST choose screens ONLY from this fixed vocabulary of screen roles "
        f"(use the exact role ids, never invent new ones):\n  {vocab}\n\n"
        "Role meanings: splash/onboarding = intro; login/signup = auth (include "
        "ONLY if the app needs accounts); home/dashboard = the primary landing "
        "(dashboard = stats/overview-first, home = feed/hub — pick ONE as the "
        "landing); search = find items; list = browse core items; details = one "
        "item; detailSecondary = messaging/chat; cart = review items; checkout = "
        "pay/confirm a transaction or booking; confirmation = success receipt; "
        "tracking = live order/delivery status; profile = account; settings = "
        "preferences; generic = a fallback screen (avoid unless nothing fits).\n\n"
        "Rules: include a screen ONLY when the description truly justifies it — "
        "do NOT pad with generic screens. Always include exactly one landing "
        "(home OR dashboard). Keep the primary navigation to 2-5 screens.\n\n"
        "Respond with ONLY a JSON object with exactly these keys:\n"
        "  roles: the ordered list of chosen role ids (by user flow).\n"
        "  primary: the 2-5 role ids (a subset of roles) shown in bottom nav.\n"
        "  rationale: one short sentence explaining the structure.\n"
        "Use only role ids from the vocabulary. No extra keys or commentary."
    )


def _build_user_prompt(req: GenerateStructureRequest) -> str:
    feats = ", ".join(req.features) if req.features else "(none specified)"
    name = req.app_name or "(unnamed)"
    baseline = ", ".join(req.candidate_roles) if req.candidate_roles else "(none)"
    return (
        f"App name: {name}\n"
        f"Description: {req.description}\n"
        f"Detected features: {feats}\n"
        f"The deterministic engine's baseline screen set (you may refine it, add "
        f"justified screens, drop unjustified ones, or reorder): {baseline}\n\n"
        "Choose the screen structure now as JSON."
    )
