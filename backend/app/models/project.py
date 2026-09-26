"""
ORM models.

Persistence is intentionally lightweight for a mini-project: a Project row
stores its metadata plus the full prototype schema as JSON, and each save can
snapshot a PrototypeVersion (supports the lightweight history / restore
feature without a heavy per-component table design).

The prototype itself is a self-contained JSON document (screens, components,
navigation, tokens) — modeling every component as its own table would add
schema churn for zero academic benefit here, so we store the validated JSON.
"""
from __future__ import annotations
import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _uuid() -> str:
    return uuid.uuid4().hex


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    target_platform: Mapped[str] = mapped_column(String(16), default="ios")
    design_style: Mapped[str] = mapped_column(String(120), default="")
    target_audience: Mapped[str] = mapped_column(String(200), default="")

    # full Prototype schema as JSON
    prototype: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    versions: Mapped[list["PrototypeVersion"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="PrototypeVersion.created_at.desc()"
    )


class PrototypeVersion(Base):
    __tablename__ = "prototype_versions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String(200), default="Saved version")
    snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped["Project"] = relationship(back_populates="versions")
