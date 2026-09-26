# Morph — System Architecture

This document maps the implementation to the sections a B.Tech report expects.
It is written so you can explain and defend every part in a viva.

---

## 1. High-level view

```
┌──────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + TS)                     │
│                                                                    │
│  Landing → Create → Workspace (viewer + editor + refine)           │
│                                                                    │
│   ┌───────────────┐   analysis    ┌──────────────────────────┐    │
│   │ Create flow   │ ────────────▶ │  Generation engine (TS)  │    │
│   └───────────────┘               │  analysis + input →      │    │
│          │                        │  Prototype JSON schema   │    │
│          │ POST /api/analyze      └──────────────────────────┘    │
│          ▼                                   │                     │
└──────────┼───────────────────────────────────┼─────────────────────┘
           │                                   ▼
┌──────────▼───────────────┐        Schema-driven renderer → phone frame
│    BACKEND (FastAPI)      │
│                           │
│  /api/analyze  ──▶ ml/    │  trained TF-IDF + LogReg classifier,
│                           │  NLP preprocessing, feature/action extraction
│  /api/projects ──▶ SQLite │  persistence (Project + PrototypeVersion)
│  /api/refine   ──▶ LLM?   │  optional LLM parses instruction → command
│  /api/ml       ──▶ metrics│  accuracy / confusion matrix for the report
└───────────────────────────┘
```

**Key design decision:** the deterministic *generation* runs in the frontend
(TypeScript), while the *machine learning* runs in the backend (Python). This
keeps the prototype experience instant and always-available (there is a local
analysis fallback too), and cleanly separates "learned" from "generated".

---

## 2. Module responsibilities

### `ml/` — the machine-learning module (Python)
| File | Responsibility |
|---|---|
| `data/dataset.py` | Labeled training corpus (96 samples, 8 balanced classes). |
| `pipeline/preprocessing.py` | Tokenize / lemmatize / entity-extract (spaCy, with a dependency-free fallback). |
| `pipeline/classifier.py` | TF-IDF + Logistic Regression app-type classifier (train/persist/predict). |
| `pipeline/extraction.py` | Feature + action extraction (embeddings + keyword rules). |
| `pipeline/screen_inference.py` | Map app type + features → required screens. |
| `pipeline/analyze.py` | Orchestrator: `analyze(text) → structured analysis`. |
| `training/train.py` | Train, evaluate (CV + held-out), save model + `metrics.json`. |

### `backend/` — the API (FastAPI)
| Path | Responsibility |
|---|---|
| `app/api/analyze.py` | `POST /api/analyze` → runs the ML pipeline. |
| `app/api/projects.py` | Project CRUD, duplicate, versions. |
| `app/api/refine.py` | `POST /api/refine/parse` → structured refinement command. |
| `app/api/ml.py` | Model status + training metrics. |
| `app/services/refinement.py` | Rule-based parser + optional LLM (OpenAI/Gemini). |
| `app/models/project.py` | SQLAlchemy models. |

### `frontend/` — the platform (React + TS)
| Path | Responsibility |
|---|---|
| `types/schema.ts` | The canonical prototype schema (shared contract). |
| `lib/generator.ts` | Deterministic generation engine. |
| `lib/screens.ts`, `factory.ts`, `content.ts` | Screen/component builders + sample content. |
| `lib/localAnalysis.ts` | Offline analysis fallback (mirrors the backend keyword path). |
| `lib/refine.ts` | Apply a refinement command to a prototype. |
| `components/prototype/*` | Schema-driven renderer, phone frame, interactive player. |
| `features/workspace/*` | Properties editor, ML insight, flow graph, refine bar. |
| `pages/*` | Landing, Dashboard, Create, Workspace. |

---

## 3. Data model / schema

The prototype is one JSON document (`types/schema.ts`):

```
Prototype
├── appName, appType, designStyle, targetPlatform
├── tokens: DesignTokens         # colors, typography, radius, spacing
├── screens: Screen[]
│     └── components: Component[] # type, content, style, props, action
├── navigation: { entry, edges[] } # screen-to-screen graph
└── analysis: RequirementAnalysis  # what the ML produced (for the insight panel)
```

Database (SQLite via SQLAlchemy):
- `projects` — metadata + the full prototype JSON.
- `prototype_versions` — snapshots for the lightweight history / restore.

We store the prototype as a validated JSON document rather than one table per
component: for a single-user mini-project that is simpler, faster and loses no
academic value. Swapping to PostgreSQL requires only changing `DATABASE_URL`.

---

## 4. Generation pipeline (deterministic half)

1. Take the analysis (app type + inferred screen roles + features).
2. Assign a concrete id per screen role.
3. Build each screen's components via role-specific builders.
4. Derive the navigation graph from the navigate-actions actually placed on
   buttons/lists (so the graph and the UI can never disagree).
5. Resolve a design-token preset from app type + requested style.

Because it is pure and deterministic, the same input always yields the same
prototype — and it can never produce a screen that a button links to but that
doesn't exist.

---

## 5. Error handling & reliability

- Empty/short descriptions are rejected with a friendly inline message.
- If the backend is down, analysis falls back to the local model, refinement to
  the local parser, and persistence to `localStorage` — the demo never breaks.
- The backend returns clean JSON error envelopes, never raw stack traces.
- Unhandled exceptions are caught by middleware and logged server-side.

---

## 6. Security

- No secrets in code. The LLM key is read from `.env` (`backend/.env`), never
  shipped to the frontend.
- The optional LLM only ever receives the short edit instruction, never project
  data or secrets.
- CORS origins are configurable via env.

---

## 7. What maps to which report section

| Report section | Where it lives |
|---|---|
| Proposed System / Objectives | This doc §1, README |
| System Architecture | This doc §1–§2 |
| Methodology / ML Method | `docs/ML.md`, `ml/` |
| UI Generation Pipeline | This doc §4, `frontend/src/lib/` |
| Database Design | This doc §3, `backend/app/models` |
| Implementation | `backend/`, `frontend/`, `ml/` |
| Results | `ml/models/metrics.json`, ML insight panel |
| Testing | `backend/tests/`, `frontend` vitest |
| Limitations / Future Scope | README + `docs/ML.md` |
