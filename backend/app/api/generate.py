"""Per-request content generation endpoint (the hybrid "smart tier").

    POST /api/generate/content

Given the classified app_type + the user's description/features, returns
request-specific screen content (or a fallback signal so the frontend uses its
built-in library). Mirrors the refine router's shape and its offline honesty.
"""
from __future__ import annotations
import importlib.util
import os
import sys
from pathlib import Path

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.project import (
    GenerateContentRequest,
    GenerateContentResponse,
    GenerateStructureRequest,
    GenerateStructureResponse,
)
from app.services.content_service import generate_content
from app.services.structure_service import generate_structure

router = APIRouter(prefix="/generate", tags=["generate"])


@router.get("/status")
def generate_status() -> dict:
    s = get_settings()
    return {
        "llm_enabled": s.llm_enabled,
        "provider": s.llm_provider if s.llm_enabled else "none",
        "mode": "llm" if s.llm_enabled else "library (offline)",
        # --- TEMPORARY runtime diagnostics (SAFE: no API key value) ---
        # Reveals the EXACT Settings object this HTTP worker is using, so we can
        # compare it against a direct get_settings() call. Remove once resolved.
        "_debug": {
            "settings_module": type(s).__module__,
            "settings_class": type(s).__name__,
            "settings_id": id(s),
            "llm_provider": s.llm_provider,
            "llm_model": s.llm_model,
            "llm_enabled": s.llm_enabled,
            "api_key_present": bool(s.llm_api_key),
            # If a shell already exported LLM_PROVIDER (empty/"none"), our .env
            # priming uses setdefault and will NOT override it -> this is the
            # smoking gun for a stale/rogue-env worker. "gemini" == primed OK.
            "os_environ_LLM_PROVIDER": os.environ.get("LLM_PROVIDER"),
            "os_environ_has_LLM_API_KEY": "LLM_API_KEY" in os.environ,
            # Which files this worker actually imported (detects stale process /
            # second checkout / wrong working tree).
            "config_file": getattr(sys.modules.get(type(s).__module__), "__file__", None),
            "module_files": {
                name: getattr(sys.modules.get(name), "__file__", None)
                for name in ("app.main", "app.api.generate", "app.core.config")
            },
        },
    }


@router.get("/diagnostics")
def generate_diagnostics() -> dict:
    """SAFE, non-secret diagnostic. Reports whether config loaded and the SDK is
    importable — never the API key value (only whether one is present)."""
    s = get_settings()
    env_path = Path(__file__).resolve().parents[2] / ".env"
    genai_ok = importlib.util.find_spec("google.genai") is not None
    return {
        "provider": s.llm_provider,
        "model": s.llm_model,
        "api_key_present": bool(s.llm_api_key),
        "env_file_path": str(env_path),
        "env_file_found": env_path.exists(),
        "google_genai_importable": genai_ok,
        "llm_enabled": s.llm_enabled,
    }


@router.post("/content", response_model=GenerateContentResponse)
def content(req: GenerateContentRequest) -> GenerateContentResponse:
    return generate_content(req)


@router.post("/structure", response_model=GenerateStructureResponse)
def structure(req: GenerateStructureRequest) -> GenerateStructureResponse:
    """Phase 2: propose a screen structure for THIS request (LLM-assisted).
    Falls back to a null structure so the frontend uses its deterministic
    requirement-driven selection when the LLM is disabled/unavailable."""
    return generate_structure(req)
