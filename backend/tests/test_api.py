"""
API smoke + integration tests using FastAPI's TestClient.

Covers: analyze, refinement parsing, and the full project CRUD lifecycle
against an isolated in-memory SQLite database.
"""
from __future__ import annotations
import os
import sys

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
API = "/api"


def test_health():
    r = client.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_analyze_empty_is_rejected():
    r = client.post(f"{API}/analyze", json={"description": ""})
    assert r.status_code == 422  # validation


def test_analyze_returns_analysis():
    r = client.post(f"{API}/analyze", json={
        "description": "an online shopping app to browse products, add to cart and checkout"
    })
    assert r.status_code == 200
    body = r.json()
    assert "appType" in body and "inferredScreens" in body
    assert len(body["inferredScreens"]) >= 3


def test_refine_parse_dark_theme():
    r = client.post(f"{API}/refine/parse", json={"instruction": "make it dark mode", "screen_roles": []})
    assert r.status_code == 200
    assert r.json()["op"] == "toggle_dark"


def test_refine_parse_add_screen():
    r = client.post(f"{API}/refine/parse", json={"instruction": "add a settings screen", "screen_roles": []})
    assert r.status_code == 200
    body = r.json()
    assert body["op"] == "add_screen" and body["screen_role"] == "settings"


def test_project_crud_lifecycle():
    prototype = {"schemaVersion": 1, "appName": "Test", "screens": [{"id": "s1"}]}
    # create
    r = client.post(f"{API}/projects", json={
        "name": "Test app", "description": "d", "target_platform": "ios",
        "design_style": "minimal", "target_audience": "", "prototype": prototype,
    })
    assert r.status_code == 201
    pid = r.json()["id"]

    # list
    r = client.get(f"{API}/projects")
    assert r.status_code == 200
    assert any(p["id"] == pid for p in r.json())

    # read
    r = client.get(f"{API}/projects/{pid}")
    assert r.status_code == 200
    assert r.json()["prototype"]["appName"] == "Test"

    # update with snapshot
    r = client.put(f"{API}/projects/{pid}", json={"name": "Renamed", "snapshot_label": "v1"})
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed"

    # versions recorded
    r = client.get(f"{API}/projects/{pid}/versions")
    assert r.status_code == 200
    assert len(r.json()) >= 1

    # duplicate
    r = client.post(f"{API}/projects/{pid}/duplicate")
    assert r.status_code == 201
    assert "(copy)" in r.json()["name"]

    # delete
    r = client.delete(f"{API}/projects/{pid}")
    assert r.status_code == 204
    r = client.get(f"{API}/projects/{pid}")
    assert r.status_code == 404


def test_missing_project_is_404():
    r = client.get(f"{API}/projects/does-not-exist")
    assert r.status_code == 404
