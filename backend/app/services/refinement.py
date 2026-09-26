"""
AI Refinement — natural-language edit parsing.

Honest division of labor (this is the viva answer for "what does the LLM do"):
  * The LLM (optional) ONLY parses a free-text instruction into a structured
    RefinementCommand. It does not generate UI.
  * The deterministic engine (frontend) APPLIES that command to the prototype.
  * With no API key, a rule-based parser handles the common instructions, so
    refinement works fully offline.

This keeps generation reliable and the ML/LLM role crisp and explainable.
"""
from __future__ import annotations
import re
from typing import List, Optional

from app.core.config import get_settings
from app.schemas.project import RefineParseRequest, RefinementCommand

_THEME_WORDS = {
    "premium-dark": ["dark", "premium", "sleek", "night", "black"],
    "minimal-fresh": ["minimal", "clean", "simple", "light", "white"],
    "energetic-fitness": ["energetic", "bold", "vibrant", "sporty"],
    "trust-finance": ["corporate", "trust", "professional", "finance", "bank"],
    "warm-commerce": ["warm", "friendly", "shopping", "commerce"],
    "calm-education": ["calm", "soft", "education", "learning"],
}

_KNOWN_ROLES = [
    "splash", "login", "signup", "home", "dashboard", "search", "list",
    "details", "cart", "checkout", "confirmation", "profile", "settings",
]


def parse_rule_based(req: RefineParseRequest) -> RefinementCommand:
    text = req.instruction.lower().strip()

    # dark theme
    if "dark" in text and ("theme" in text or "mode" in text):
        return RefinementCommand(op="toggle_dark", note="Switch the prototype to a dark theme.", source="rule")

    # set a named theme / style
    for preset, words in _THEME_WORDS.items():
        if any(w in text for w in words) and ("theme" in text or "style" in text or "look" in text or "make it" in text):
            return RefinementCommand(op="set_theme", theme_preset=preset,
                                     note=f"Apply the '{preset}' theme.", source="rule")

    # add / remove a screen
    m = re.search(r"\badd (?:a |an )?(\w+)(?: screen| page)?", text)
    if m and ("screen" in text or "page" in text or m.group(1) in _KNOWN_ROLES):
        role = _match_role(m.group(1))
        if role:
            return RefinementCommand(op="add_screen", screen_role=role,
                                     note=f"Add a {role} screen.", source="rule")

    m = re.search(r"\b(?:remove|delete) (?:the )?(\w+)(?: screen| page)?", text)
    if m:
        role = _match_role(m.group(1))
        if role:
            return RefinementCommand(op="remove_screen", screen_role=role,
                                     note=f"Remove the {role} screen.", source="rule")

    # rename app
    m = re.search(r"(?:rename|call) (?:the app |it )?(?:to |as )?[\"']?([a-z0-9 ]{2,30})[\"']?$", text)
    if m:
        name = m.group(1).strip().title()
        return RefinementCommand(op="rename_app", app_name=name,
                                 note=f"Rename the app to '{name}'.", source="rule")

    # simplify
    if "simpl" in text or "cleaner" in text or "less" in text:
        role = _find_role_in_text(text) or "home"
        return RefinementCommand(op="simplify_screen", screen_role=role,
                                 note=f"Simplify the {role} screen.", source="rule")

    # premium (no explicit 'theme')
    if "premium" in text or "luxur" in text:
        return RefinementCommand(op="set_theme", theme_preset="premium-dark",
                                 note="Apply a premium dark theme.", source="rule")

    return RefinementCommand(op="unknown",
                             note="I couldn't map that to a supported edit. Try: "
                                  "'add a settings screen', 'make it dark', "
                                  "'apply a minimal theme', or 'rename to Feast'.",
                             source="rule")


def _match_role(word: str) -> Optional[str]:
    word = word.strip().lower()
    aliases = {
        "signin": "login", "sign": "login", "register": "signup",
        "account": "profile", "payment": "checkout", "pay": "checkout",
        "browse": "list", "products": "list", "product": "details",
    }
    word = aliases.get(word, word)
    return word if word in _KNOWN_ROLES else None


def _find_role_in_text(text: str) -> Optional[str]:
    for r in _KNOWN_ROLES:
        if r in text:
            return r
    return None


def parse_instruction(req: RefineParseRequest) -> RefinementCommand:
    """Try the LLM (if configured) to parse, else fall back to rules."""
    settings = get_settings()
    if settings.llm_enabled:
        try:
            cmd = _parse_with_llm(req, settings)
            if cmd is not None:
                return cmd
        except Exception:
            # Any LLM failure => graceful rule-based fallback (never breaks demo)
            pass
    return parse_rule_based(req)


def _parse_with_llm(req: RefineParseRequest, settings) -> Optional[RefinementCommand]:
    """Ask the configured LLM to emit a RefinementCommand as JSON.

    Providers are optional imports so the app never hard-depends on them.
    """
    import json

    system = (
        "You translate a user's UI edit request into ONE JSON command. "
        "Allowed ops: set_theme (theme_preset one of "
        "minimal-fresh|premium-dark|energetic-fitness|trust-finance|warm-commerce|calm-education), "
        "toggle_dark, add_screen (screen_role), remove_screen (screen_role), "
        "rename_app (app_name), simplify_screen (screen_role), unknown. "
        f"Known screen roles: {', '.join(_KNOWN_ROLES)}. "
        "Respond with ONLY a JSON object with keys: op and any relevant args, and a short 'note'."
    )
    user = f"Instruction: {req.instruction}\nCurrent screens: {req.screen_roles}"

    content = None
    provider = settings.llm_provider.lower()

    if provider == "openai":
        from openai import OpenAI  # type: ignore
        client = OpenAI(api_key=settings.llm_api_key)
        resp = client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content
    elif provider == "gemini":
        # New unified Google GenAI SDK (`google-genai`), matching content_service.
        from google import genai  # type: ignore
        from google.genai import types  # type: ignore
        client = genai.Client(api_key=settings.llm_api_key)
        resp = client.models.generate_content(
            model=settings.llm_model,
            contents=system + "\n\n" + user,
            config=types.GenerateContentConfig(temperature=0),
        )
        content = resp.text
    else:
        return None

    if not content:
        return None
    data = json.loads(_extract_json(content))
    data["source"] = "llm"
    # validate/normalize through the pydantic model
    return RefinementCommand(**{k: v for k, v in data.items() if k in RefinementCommand.model_fields})


def _extract_json(text: str) -> str:
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return text[start : end + 1]
    return text
