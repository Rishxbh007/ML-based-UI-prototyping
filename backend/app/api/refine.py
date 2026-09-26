"""AI refinement: parse a natural-language edit into a structured command."""
from __future__ import annotations
from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.project import RefineParseRequest, RefinementCommand
from app.services.refinement import parse_instruction

router = APIRouter(prefix="/refine", tags=["refine"])


@router.get("/status")
def refine_status() -> dict:
    s = get_settings()
    return {
        "llm_enabled": s.llm_enabled,
        "provider": s.llm_provider if s.llm_enabled else "none",
        "mode": "llm" if s.llm_enabled else "rule-based (offline)",
    }


@router.post("/parse", response_model=RefinementCommand)
def parse(req: RefineParseRequest) -> RefinementCommand:
    return parse_instruction(req)
