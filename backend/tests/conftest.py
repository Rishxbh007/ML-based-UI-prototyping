"""
Pytest configuration.

Points the app at an isolated, temporary SQLite database BEFORE the app (and
its cached settings) are imported, so tests never touch a real morph.db.
"""
from __future__ import annotations
import os
import sys
import tempfile

# A throwaway DB file for the test session.
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"
os.environ["LLM_PROVIDER"] = "none"  # force offline rule-based refinement in tests

# Make the backend package importable regardless of how pytest is invoked.
_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

# Create the SQLite schema BEFORE any API test runs. TestClient is used without
# a `with` block in the tests, so FastAPI's startup event (which calls init_db)
# does not fire — we initialize the schema explicitly here so the `projects`
# table exists for the CRUD tests. The env vars above are already set, so the
# engine binds to the temporary test database.
from app.db.session import init_db  # noqa: E402  (import after env is configured)

init_db()
