"""ML introspection endpoints — power the "ML insight" panel in the UI."""
from __future__ import annotations
from fastapi import APIRouter, HTTPException

from app.services import ml_service

router = APIRouter(prefix="/ml", tags=["ml"])


@router.get("/status")
def status() -> dict:
    try:
        st = ml_service.model_status()
    except ModuleNotFoundError:
        return {"trained": False, "available": False,
                "note": "Install backend requirements to enable the trained model."}
    return {**st, "available": True}


@router.get("/metrics")
def metrics() -> dict:
    data = ml_service.load_metrics()
    if data is None:
        raise HTTPException(
            status_code=404,
            detail="No metrics yet. Train the model: python -m ml.training.train",
        )
    return data
