"""
Morph API — FastAPI application entry point.

    uvicorn app.main:app --reload --port 8000

Wires routers, CORS, DB init and consistent error handling. The API serves the
ML analysis, project persistence and refinement-parsing; the deterministic UI
generation runs in the frontend engine.
"""
from __future__ import annotations
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.db.session import init_db
from app.api import analyze, projects, refine, ml, generate

logger = logging.getLogger("morph")
settings = get_settings()

app = FastAPI(
    title="Morph API",
    version="0.1.0",
    description="ML-based mobile-app GUI prototyping — analysis, persistence & refinement.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()
    logger.info("Morph API started (env=%s, llm=%s)", settings.app_env,
                "on" if settings.llm_enabled else "off")


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    # Never leak a raw stack trace to the client; return a clean envelope.
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


@app.get(settings.api_prefix + "/health", tags=["health"])
def health() -> dict:
    return {"status": "ok", "llm_enabled": settings.llm_enabled}


# Routers (all under the configured API prefix, e.g. /api)
for r in (analyze.router, projects.router, refine.router, ml.router, generate.router):
    app.include_router(r, prefix=settings.api_prefix)
