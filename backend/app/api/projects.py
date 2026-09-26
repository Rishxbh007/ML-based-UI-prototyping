"""Project persistence: create, list, read, update, duplicate, delete + versions."""
from __future__ import annotations
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.project import Project, PrototypeVersion
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectOut, ProjectSummary, VersionOut,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def _screen_count(prototype: dict) -> int:
    try:
        return len(prototype.get("screens", []))
    except Exception:
        return 0


def _get_or_404(db: Session, project_id: str) -> Project:
    obj = db.get(Project, project_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return obj


@router.get("", response_model=List[ProjectSummary])
def list_projects(db: Session = Depends(get_db)) -> List[ProjectSummary]:
    rows = db.scalars(select(Project).order_by(Project.updated_at.desc())).all()
    return [
        ProjectSummary(
            id=p.id, name=p.name, description=p.description,
            target_platform=p.target_platform, design_style=p.design_style,
            updated_at=p.updated_at, screen_count=_screen_count(p.prototype),
        )
        for p in rows
    ]


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> Project:
    project = Project(
        name=payload.name,
        description=payload.description,
        target_platform=payload.target_platform,
        design_style=payload.design_style,
        target_audience=payload.target_audience,
        prototype=payload.prototype,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)) -> Project:
    return _get_or_404(db, project_id)


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)) -> Project:
    project = _get_or_404(db, project_id)

    # Optional snapshot of the CURRENT prototype before overwriting.
    if payload.snapshot_label and project.prototype:
        db.add(PrototypeVersion(project_id=project.id, label=payload.snapshot_label, snapshot=project.prototype))

    for field in ("name", "description", "design_style", "target_audience", "prototype"):
        value = getattr(payload, field)
        if value is not None:
            setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/duplicate", response_model=ProjectOut, status_code=201)
def duplicate_project(project_id: str, db: Session = Depends(get_db)) -> Project:
    src = _get_or_404(db, project_id)
    copy = Project(
        name=f"{src.name} (copy)",
        description=src.description,
        target_platform=src.target_platform,
        design_style=src.design_style,
        target_audience=src.target_audience,
        prototype=src.prototype,
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy


@router.delete("/{project_id}", status_code=204, response_class=Response)
def delete_project(project_id: str, db: Session = Depends(get_db)) -> Response:
    project = _get_or_404(db, project_id)
    db.delete(project)
    db.commit()
    # 204 must carry no body — return an empty Response explicitly so FastAPI
    # doesn't try to serialize a JSON null.
    return Response(status_code=204)


@router.get("/{project_id}/versions", response_model=List[VersionOut])
def list_versions(project_id: str, db: Session = Depends(get_db)) -> List[PrototypeVersion]:
    _get_or_404(db, project_id)
    rows = db.scalars(
        select(PrototypeVersion)
        .where(PrototypeVersion.project_id == project_id)
        .order_by(PrototypeVersion.created_at.desc())
    ).all()
    return list(rows)
