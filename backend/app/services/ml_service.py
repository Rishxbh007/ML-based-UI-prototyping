"""
Bridge to the ML pipeline (the `ml/` package at the project root).

The backend runs from `backend/`, so we add the project root to sys.path and
import the pipeline. Keeping the ML code in its own top-level package (rather
than inside the backend) mirrors the architecture in the report: ML is a
distinct module the API merely serves.
"""
from __future__ import annotations
import os
import sys
import json
from functools import lru_cache
from typing import Any, Dict, Optional

# project_root/backend/app/services/ml_service.py -> project_root
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

_METRICS_PATH = os.path.join(_PROJECT_ROOT, "ml", "models", "metrics.json")


def analyze_requirement(description: str) -> Dict[str, Any]:
    """Run the full ML analysis pipeline. Imported lazily so the app can boot
    even if optional ML deps are missing (the call will then raise clearly)."""
    from ml.pipeline.analyze import analyze  # type: ignore
    return analyze(description)


@lru_cache
def model_status() -> Dict[str, Any]:
    from ml.pipeline.classifier import AppTypeClassifier  # type: ignore
    return {"trained": AppTypeClassifier.is_trained()}


def load_metrics() -> Optional[Dict[str, Any]]:
    """Training metrics (accuracy, confusion matrix) for the ML insight panel."""
    if not os.path.exists(_METRICS_PATH):
        return None
    try:
        with open(_METRICS_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return None
