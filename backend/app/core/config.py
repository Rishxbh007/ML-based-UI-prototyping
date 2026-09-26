"""Application settings, loaded from environment / .env (never hardcoded)."""
from __future__ import annotations
import os
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchor the .env to the backend/ directory (this file is backend/app/core/config.py,
# so parents[2] == backend/). Using an absolute path makes settings load correctly
# regardless of the process working directory uvicorn happens to be launched from.
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


def _prime_environ_from_dotenv(path: Path) -> None:
    """Populate os.environ from the .env BEFORE Settings() is constructed.

    pydantic-settings reads os.environ unconditionally, whereas its own
    env_file parsing depends on python-dotenv being installed AND on the
    process CWD when a relative path is used. Priming os.environ ourselves
    removes both failure modes — the reason `LLM_PROVIDER=gemini` was silently
    becoming `provider=none`. Existing real env vars win (setdefault), so this
    never clobbers an intentional shell override. Never logs values.
    """
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip())


_prime_environ_from_dotenv(_ENV_FILE)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    api_prefix: str = "/api"

    # Comma-separated list in the env; parsed to a list below.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    database_url: str = "sqlite:///./morph.db"

    # Optional LLM refinement. Empty/"none" => rule-based fallback (offline).
    llm_provider: str = "none"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_enabled(self) -> bool:
        return self.llm_provider.lower() not in ("", "none") and bool(self.llm_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
