"""Requirement analysis endpoint — runs the trained ML pipeline."""
from __future__ import annotations
from fastapi import APIRouter, HTTPException

from app.schemas.analysis import AnalyzeRequest, AnalysisResponse
from app.services import ml_service

router = APIRouter(prefix="/analyze", tags=["analysis"])


@router.post("", response_model=AnalysisResponse)
def analyze(req: AnalyzeRequest) -> AnalysisResponse:
    text = req.description.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Description must not be empty.")
    try:
        result = ml_service.analyze_requirement(text)
    except ModuleNotFoundError as e:
        # ML dependencies not installed — actionable error, not a 500 stack trace.
        raise HTTPException(
            status_code=503,
            detail=f"ML pipeline unavailable ({e}). Install backend requirements and train the model.",
        )
    return AnalysisResponse(**result)
