"""
Per-request content generation — the "smart tier" of the hybrid pipeline.

Honest division of labor (the viva answer for "what does the LLM do now?"):
  * The classifier still decides the DOMAIN and the deterministic engine still
    decides the SCREENS, NAVIGATION and DESIGN. None of that moves to the LLM.
  * The LLM (optional) only authors the PRESENTATIONAL CONTENT for one specific
    request — the feed items, detail copy, highlights, reviews and hero lines —
    filling the exact same `AppContent` slots the built-in library fills.
  * With no API key (or any failure), the frontend falls back to its bundled
    content library, so generation stays fully offline-capable and free.

This is what kills the "every food app says Bella Napoli" ceiling: the copy is
derived from THIS description instead of a per-domain constant.
"""
from __future__ import annotations
import json
import logging
import os
import time
from typing import Callable, List, Optional, Tuple

from app.core.config import get_settings
from app.schemas.project import (
    AppContentModel,
    GenerateContentRequest,
    GenerateContentResponse,
)

logger = logging.getLogger("morph")

# --- Gemini transient-failure resilience (Phase 1) -------------------------
# Gemini occasionally returns transient capacity/availability errors (HTTP
# 429 / 5xx, e.g. "503 UNAVAILABLE — high demand"). Those ARE retryable; a
# small bounded exponential backoff usually rides them out. Schema/JSON/
# extraction failures are NOT retried (a retry can't fix malformed output).
# Tuning lives here on purpose — set LLM_MAX_RETRIES = 0 to disable retries.
LLM_MAX_RETRIES = 2               # extra attempts AFTER the first (0 = off)
LLM_RETRY_BASE_DELAY = 0.75       # seconds; delay = base * 2**attempt
LLM_RETRYABLE_STATUS = (408, 429, 500, 502, 503, 504)

# --- Provider / model fallback chain (Phase 1) -----------------------------
# Providers whose call path already exists in THIS file (no new SDKs). The
# offline deterministic content library remains the final safety net below.
_SUPPORTED_PROVIDERS = ("gemini", "openai")

# An OPTIONAL secondary attempt, tried only if the primary is unavailable.
# Configure it purely through env / .env (read via os.environ, which config.py
# already primes from .env) — nothing is called unless a usable key exists:
#   LLM_FALLBACK_PROVIDER = gemini | openai
#   LLM_FALLBACK_MODEL    = e.g. gemini-2.5-flash  (a lower-demand model)
#   LLM_FALLBACK_API_KEY  = optional; omit to reuse the primary key when the
#                           fallback provider is the SAME as the primary.
_FALLBACK_PROVIDER_ENV = "LLM_FALLBACK_PROVIDER"
_FALLBACK_MODEL_ENV = "LLM_FALLBACK_MODEL"
_FALLBACK_KEY_ENV = "LLM_FALLBACK_API_KEY"

# Stages where the provider failed to DELIVER output → try the next provider.
# JSON/schema failures are NOT here: the provider responded but the content was
# malformed, which is terminal (never treated as an availability/capacity miss).
_ADVANCE_STAGES = frozenset({"sdk-import", "gemini-api", "openai-api",
                             "extraction", "empty-response"})


def _is_retryable_api_error(exc: Exception) -> bool:
    """True only for transient Gemini capacity/availability errors (429/5xx).

    Prefers the SDK's numeric status (`code`/`status_code`); falls back to
    matching well-known transient markers in the message. Deliberately narrow
    so genuine client/config errors (e.g. 400/401/404) are NOT retried."""
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    if isinstance(code, int) and code in LLM_RETRYABLE_STATUS:
        return True
    msg = str(exc).upper()
    if any(marker in msg for marker in ("UNAVAILABLE", "RESOURCE_EXHAUSTED", "OVERLOADED")):
        return True
    return any(f" {s}" in f" {msg}" for s in LLM_RETRYABLE_STATUS)


class _LLMStageError(Exception):
    """Carries WHICH stage of the LLM path failed, so a fallback is never a
    mystery. `stage` is one of: sdk-import, gemini-api, openai-api, extraction,
    empty-response, json-parse, schema. The message is scrubbed of any secret
    before it is ever surfaced (log or HTTP note)."""

    def __init__(self, stage: str, exc: Exception) -> None:
        self.stage = stage
        self.detail = f"{type(exc).__name__}: {exc}"
        super().__init__(f"[{stage}] {self.detail}")


def _scrub(msg: str, secret: str) -> str:
    """Remove the API key from any diagnostic string (belt-and-braces — provider
    errors don't normally echo the key) and cap the length."""
    if secret and secret in msg:
        msg = msg.replace(secret, "***")
    return msg[:280]


def generate_content(req: GenerateContentRequest) -> GenerateContentResponse:
    """Try the configured LLM to author content; else signal a fallback.

    Never raises: any problem degrades to `source="fallback"` with content=None,
    which tells the frontend to use its deterministic library. The reason is
    logged (uvicorn console) so a fallback is never a silent mystery.
    """
    settings = get_settings()
    if not settings.llm_enabled:
        logger.info("content: LLM disabled (provider=%r, key set=%s) -> library fallback",
                    settings.llm_provider, bool(settings.llm_api_key))
        return GenerateContentResponse(
            content=None, source="fallback",
            note="LLM disabled — using the built-in content library.",
        )
    try:
        logger.info("content: calling %s via %s for app_type=%s",
                    settings.llm_model, settings.llm_provider, req.app_type)
        content = _generate_with_llm(req, settings)
        if content is not None:
            logger.info("content: LLM authored %d items for app_type=%s",
                        len(content.primary_list), req.app_type)
            return GenerateContentResponse(content=content, source="llm", note="Generated for this request.")
        logger.warning("content: LLM returned no usable content -> library fallback")
        reason = "no usable content"
    except _LLMStageError as se:
        # Categorized failure: we know EXACTLY which stage broke.
        reason = _scrub(str(se), settings.llm_api_key)
        logger.warning("content: LLM failed %s -> library fallback", reason)
    except Exception as exc:
        # Unexpected/uncategorized failure (never breaks generation).
        reason = _scrub(f"[unknown] {type(exc).__name__}: {exc}", settings.llm_api_key)
        logger.warning("content: LLM failed %s -> library fallback", reason)
    return GenerateContentResponse(
        content=None, source="fallback",
        note=f"LLM unavailable ({reason}) — using the built-in content library.",
    )


def _generate_with_llm(req: GenerateContentRequest, settings) -> Optional[AppContentModel]:
    """Try each configured LLM in order; first success wins (request-specific
    content). A provider is attempted only when a usable API key exists, so one
    is never called unconfigured. If every configured provider is unavailable,
    the last categorized error is raised → deterministic library fallback."""
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
                logger.warning("content: attempt %d/%d (%s/%s) unavailable at %s -> next provider",
                               idx, len(chain), provider, model, se.stage)
                continue
            raise  # terminal stage, or no more providers configured
        # Provider delivered text → parse + STRICT validate. A malformed payload
        # is terminal (NOT a capacity miss), so we do NOT advance to the next.
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
# __CHAIN_HELPERS__


def _provider_chain(settings) -> List[Tuple[str, str, str]]:
    """Ordered list of (provider, api_key, model) attempts.

    1. Primary — from Settings (llm_provider / llm_api_key / llm_model).
    2. Secondary — OPTIONAL, from env (LLM_FALLBACK_*). Reuses the primary key
       when the fallback provider matches the primary and no key is given.

    Attempts without a usable key or an unsupported provider are dropped, so a
    provider is NEVER called unless it is actually configured."""
    chain: List[Tuple[str, str, str]] = []

    primary = settings.llm_provider.lower()
    if primary in _SUPPORTED_PROVIDERS and settings.llm_api_key:
        chain.append((primary, settings.llm_api_key, settings.llm_model))

    fb_provider = os.environ.get(_FALLBACK_PROVIDER_ENV, "").strip().lower()
    fb_model = os.environ.get(_FALLBACK_MODEL_ENV, "").strip()
    fb_key = os.environ.get(_FALLBACK_KEY_ENV, "").strip()
    if fb_provider in _SUPPORTED_PROVIDERS and fb_model:
        if not fb_key and fb_provider == primary:
            fb_key = settings.llm_api_key  # model-only fallback on same key
        if fb_key:
            candidate = (fb_provider, fb_key, fb_model)
            if candidate not in chain:
                chain.append(candidate)
    return chain


def _retrying(fn: Callable[[], object], stage: str) -> object:
    """Call `fn` with the bounded exponential backoff. Retries ONLY transient
    capacity errors (429/5xx); everything else fails fast. On give-up it raises
    a categorized _LLMStageError(stage, ...)."""
    for attempt in range(LLM_MAX_RETRIES + 1):
        try:
            return fn()
        except Exception as e:
            if attempt < LLM_MAX_RETRIES and _is_retryable_api_error(e):
                delay = LLM_RETRY_BASE_DELAY * (2 ** attempt)
                logger.warning("content: transient %s error (%s) — retry %d/%d in %.2fs",
                               stage, type(e).__name__, attempt + 1, LLM_MAX_RETRIES, delay)
                time.sleep(delay)
                continue
            raise _LLMStageError(stage, e)
    raise _LLMStageError(stage, RuntimeError("retry loop exhausted"))  # unreachable
# __CALL_PROVIDER__


def _call_provider(provider: str, api_key: str, model: str, system: str, user: str) -> str:
    """Reuse the project's EXISTING per-provider call path (no new SDK) and
    return the raw model text. Raises a categorized _LLMStageError on failure;
    the API call itself is wrapped in the bounded retry."""
    if provider == "gemini":
        try:
            from google import genai  # type: ignore
            from google.genai import types  # type: ignore
        except Exception as e:
            raise _LLMStageError("sdk-import", e)
        client = genai.Client(api_key=api_key)
        cfg = types.GenerateContentConfig(
            temperature=0.7,
            response_mime_type="application/json",
            # gemini-3.x is a "thinking" model — give the JSON answer ample
            # room so it is never truncated into invalid JSON.
            max_output_tokens=4096,
        )
        resp = _retrying(
            lambda: client.models.generate_content(
                model=model, contents=system + "\n\n" + user, config=cfg),
            "gemini-api",
        )
        try:
            text = resp.text  # type: ignore[attr-defined]
        except Exception as e:
            # `.text` raises if finish_reason isn't a clean STOP (MAX_TOKENS/SAFETY).
            raise _LLMStageError("extraction", e)
    elif provider == "openai":
        try:
            from openai import OpenAI  # type: ignore
        except Exception as e:
            raise _LLMStageError("sdk-import", e)
        client = OpenAI(api_key=api_key)
        resp = _retrying(
            lambda: client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system},
                          {"role": "user", "content": user}],
                temperature=0.7,
                response_format={"type": "json_object"}),
            "openai-api",
        )
        try:
            text = resp.choices[0].message.content  # type: ignore[attr-defined]
        except Exception as e:
            raise _LLMStageError("extraction", e)
    else:
        raise _LLMStageError("sdk-import", ValueError(f"unsupported provider {provider!r}"))

    if not text:
        raise _LLMStageError("empty-response", ValueError("model returned empty text"))
    return text


def _build_system_prompt(req: GenerateContentRequest) -> str:
    n_reviews = "2 to 3 short reviews" if req.wants_reviews else "an empty reviews array"
    tracking = (
        "Also fill tracking_eta (e.g. 'Arriving in 18 min') and tracking_note."
        if req.wants_tracking
        else "Leave tracking_eta and tracking_note as null."
    )
    return (
        "You are a senior product designer writing the on-screen content for a "
        f"mobile app of type '{req.app_type}'. Author realistic, specific, "
        "on-brand copy for THIS app — never generic 'Item 1' placeholders, and "
        "never reuse stock names. Everything must fit a small phone screen: keep "
        "titles short, subtitles under ~8 words.\n\n"
        "Respond with ONLY a JSON object with exactly these keys:\n"
        "  categories: 3-6 short filter labels (first is usually 'All'/'Today').\n"
        "  primary_list: 4-6 objects {title, subtitle, trailing?, price?, rating?} "
        "— the main feed/catalog, specific to this app.\n"
        "  detail_title, detail_subtitle: for the first list item's detail screen.\n"
        "  detail_body: 2-3 sentences of real product copy (no lorem, no meta text).\n"
        "  detail_highlights: 3 short factual chips (e.g. '20-30 min', 'In stock').\n"
        "  detail_price: a price string or null.\n"
        f"  reviews: {n_reviews}, each {{author, text, rating 1-5}}.\n"
        "  nav_tabs: exactly 4 bottom-tab labels.\n"
        "  hero_title, hero_subtitle: a short greeting/headline for the home screen.\n"
        f"{tracking}\n"
        "Use only plain strings/numbers. Do not add extra keys or commentary."
    )


def _build_user_prompt(req: GenerateContentRequest) -> str:
    feats = ", ".join(req.features) if req.features else "(none specified)"
    name = req.app_name or "(unnamed)"
    return (
        f"App name: {name}\n"
        f"Description: {req.description}\n"
        f"Detected features: {feats}\n\n"
        "Write the JSON content now."
    )


def _coerce(data: dict, req: GenerateContentRequest) -> AppContentModel:
    """Validate + normalize the LLM payload through the pydantic model.

    Only known fields are kept; pydantic enforces types/lengths. If the LLM
    dropped reviews when they were requested we still accept it — an empty list
    is valid and the frontend copes.
    """
    allowed = {k: v for k, v in data.items() if k in AppContentModel.model_fields}
    model = AppContentModel(**allowed)
    if not req.wants_tracking:
        model.tracking_eta = None
        model.tracking_note = None
    return model


def _extract_json(text: str) -> str:
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return text[start : end + 1]
    return text
