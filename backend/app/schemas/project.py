"""Pydantic schemas for project persistence + refinement."""
from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    target_platform: Literal["ios", "android"] = "ios"
    design_style: str = ""
    target_audience: str = ""


class ProjectCreate(ProjectBase):
    # The full generated prototype schema (built on the frontend engine).
    prototype: Dict[str, Any]


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    design_style: Optional[str] = None
    target_audience: Optional[str] = None
    prototype: Optional[Dict[str, Any]] = None
    # If provided, snapshot the current prototype under this label before update.
    snapshot_label: Optional[str] = None


class VersionOut(BaseModel):
    id: str
    label: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectOut(ProjectBase):
    id: str
    prototype: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectSummary(BaseModel):
    id: str
    name: str
    description: str
    target_platform: str
    design_style: str
    updated_at: datetime
    screen_count: int

    class Config:
        from_attributes = True


# ---- Refinement -----------------------------------------------------------
class RefineParseRequest(BaseModel):
    instruction: str = Field(..., min_length=1, max_length=500)
    # Light context so parsing can be smarter (e.g. current screens/theme).
    app_type: Optional[str] = None
    screen_roles: List[str] = []


class RefinementCommand(BaseModel):
    """A structured, deterministic operation the frontend engine applies."""
    op: Literal[
        "set_theme", "toggle_dark", "add_screen", "remove_screen",
        "rename_app", "simplify_screen", "unknown",
    ]
    # op-specific arguments
    theme_preset: Optional[str] = None
    screen_role: Optional[str] = None
    app_name: Optional[str] = None
    note: str = ""  # human-readable explanation of what will happen
    source: Literal["llm", "rule"] = "rule"


# ---- Per-request content generation ---------------------------------------
class GenerateContentRequest(BaseModel):
    """Context the LLM uses to author request-specific screen content.

    Kept intentionally small: the classifier already decided the domain; the LLM
    only fills the presentational slots with copy tailored to THIS description.
    """
    app_type: str = Field(..., min_length=1, max_length=60)
    app_name: str = Field("", max_length=120)
    description: str = Field(..., min_length=1, max_length=2000)
    features: List[str] = []
    # signals whether a reviews section will be rendered, so the LLM knows to
    # author reviews (otherwise it can skip them).
    wants_reviews: bool = True
    wants_tracking: bool = False


class ContentItemModel(BaseModel):
    """One feed/catalog row. Mirrors the frontend `Item` (minus the id/image,
    which the frontend assigns deterministically to keep tone styling stable)."""
    title: str = Field(..., min_length=1, max_length=80)
    subtitle: Optional[str] = Field(None, max_length=120)
    trailing: Optional[str] = Field(None, max_length=24)
    price: Optional[str] = Field(None, max_length=24)
    rating: Optional[float] = Field(None, ge=0, le=5)
    icon: Optional[str] = Field(None, max_length=40)


class ContentReviewModel(BaseModel):
    author: str = Field(..., min_length=1, max_length=60)
    text: str = Field(..., min_length=1, max_length=400)
    rating: int = Field(5, ge=1, le=5)


class AppContentModel(BaseModel):
    """Server-side twin of the frontend `AppContent` presentational schema."""
    categories: List[str] = []
    primary_list: List[ContentItemModel] = []
    detail_title: str = ""
    detail_subtitle: str = ""
    detail_body: str = ""
    detail_highlights: List[str] = []
    detail_price: Optional[str] = None
    reviews: List[ContentReviewModel] = []
    tracking_eta: Optional[str] = None
    tracking_note: Optional[str] = None
    nav_tabs: List[str] = []
    hero_title: str = ""
    hero_subtitle: str = ""


class GenerateContentResponse(BaseModel):
    """The generated content plus which tier produced it (honest provenance).

    `content` is null when the LLM is disabled/unavailable so the frontend falls
    back to its built-in library — the deterministic offline tier.
    """
    content: Optional[AppContentModel] = None
    source: Literal["llm", "fallback"] = "fallback"
    note: str = ""


# ---- Phase 2: LLM-assisted structure --------------------------------------
# The LLM reasons about WHICH screens the described app needs, in what order,
# and which belong to the primary (bottom) navigation — BUT only from the fixed
# screen-role vocabulary the frontend owns (passed in `allowed_roles`). The
# deterministic engine remains the source of truth: it supplies a baseline
# selection (`candidate_roles`), validates/repairs whatever the LLM returns, and
# is the complete offline fallback when the LLM is unavailable. The LLM never
# invents new roles and never touches layout/component/renderer decisions.
class GenerateStructureRequest(BaseModel):
    app_type: str = Field(..., min_length=1, max_length=60)
    app_name: str = Field("", max_length=120)
    description: str = Field(..., min_length=1, max_length=2000)
    features: List[str] = []
    # The deterministic engine's own selection — a baseline the LLM may refine.
    candidate_roles: List[str] = []
    # The COMPLETE role vocabulary the frontend supports. The LLM must choose
    # only from these; anything outside is dropped during validation.
    allowed_roles: List[str] = []


class StructurePlanModel(BaseModel):
    """An ordered screen-role set (+ the primary-nav subset) the LLM proposes."""
    roles: List[str] = []
    primary: List[str] = []
    rationale: str = Field("", max_length=400)


class GenerateStructureResponse(BaseModel):
    """The proposed structure plus which tier produced it (honest provenance).

    `structure` is null when the LLM is disabled/unavailable so the frontend
    falls back to its deterministic requirement-driven screen selection.
    """
    structure: Optional[StructurePlanModel] = None
    source: Literal["llm", "fallback"] = "fallback"
    note: str = ""
