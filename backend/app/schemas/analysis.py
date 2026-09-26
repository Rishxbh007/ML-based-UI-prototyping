"""Pydantic schemas for requirement analysis."""
from __future__ import annotations
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000,
                            description="Natural-language app description.")


class FeatureOut(BaseModel):
    name: str
    confidence: float
    source: Literal["ml", "rule"]


class ProbabilityOut(BaseModel):
    label: str
    score: float


class InferredScreenOut(BaseModel):
    role: str
    reason: str
    # New optional fields from the requirement-driven planner (ignored by the
    # current renderer, available for future use).
    name: Optional[str] = None
    priority: Optional[str] = None


class EntityOut(BaseModel):
    text: str
    kind: str


class PipelineOut(BaseModel):
    preprocessing: str
    classifier: str
    extraction: str
    # transparency fields (optional): raw classifier label vs reasoned primary
    classifier_label: Optional[str] = None
    reasoned_primary: Optional[str] = None


class AnalysisResponse(BaseModel):
    appType: str
    appTypeConfidence: float
    appTypeProbabilities: List[ProbabilityOut]
    targetUsers: str
    purpose: str
    features: List[FeatureOut]
    actions: List[str]
    entities: List[EntityOut]
    inferredScreens: List[InferredScreenOut]
    pipeline: PipelineOut
    # NEW (additive, backward-compatible): confidence / uncertainty decision.
    # When the classifier had too little evidence or no class is clearly ahead,
    # needsClarification is True and `clarification` carries a user-facing prompt
    # so the frontend can ask for more detail instead of generating a likely-wrong
    # prototype. `classification` exposes the decision + evidence for the ML panel.
    needsClarification: bool = False
    clarification: Optional[str] = None
    classification: Optional[Dict[str, Any]] = None
    # NEW: the richer structured Application Specification. Kept as a flexible
    # object so the schema stays forward-compatible as the spec evolves.
    applicationSpec: Optional[Dict[str, Any]] = None
