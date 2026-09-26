# Morph — ML-Based Prototyping of Mobile-App GUIs

> Describe an app in plain English. Watch a real, interactive mobile prototype build itself.

**Morph** is an AI-assisted platform that turns a natural-language app description
(*"a food delivery app where users sign up, browse restaurants, and place orders"*)
into a **structured, interactive mobile-app prototype** — screens, components,
navigation and theming — rendered inside a realistic phone frame.

This is a B.Tech project built to be **academically honest**: the machine-learning
component is real and measurable, and it is cleanly separated from the deterministic
generation engine. Nothing is a black box you can't explain.

---

## The pipeline (how it actually works)

```
Natural language
   │
   ▼
[1] NLP preprocessing         spaCy / rule tokenizer — clean, lemmatize, extract entities
   │
   ▼
[2] App-type classifier       TRAINED ML: TF-IDF + Logistic Regression
   │                          (food-delivery / fitness / banking / education / social / ...)
   ▼
[3] Feature + action extract  semantic similarity (embeddings) + keyword rules
   │
   ▼
[4] Screen inference          features → required screens
   │
   ▼
[5] Deterministic UI engine   screens → components → layout → navigation graph → design tokens
   │                          100% rule-based → reliable, never hallucinates a broken screen
   ▼
[6] JSON prototype schema  →  React renderer  →  interactive prototype
```

**What is genuine ML:** steps 1–3 (classification, extraction, semantic matching).
**What is deterministic:** steps 4–6 (the actual screen/layout/navigation generation).
**What the optional LLM does:** *only* the "AI Refinement" feature (natural-language
edits like "add a dark theme"). The core product works fully offline with **no API key.**

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/ML.md`](docs/ML.md) for the
viva-ready explanation.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Fast, typed, modern |
| Styling | Tailwind CSS + custom design tokens | Premium UI without CSS sprawl |
| Animation | Framer Motion | Tasteful transitions |
| State | Zustand | Minimal, no boilerplate |
| Backend | FastAPI + Pydantic | Typed, validated, auto-docs |
| ML | scikit-learn + (optional) sentence-transformers / spaCy | Trainable, measurable, explainable |
| DB | SQLite via SQLAlchemy | Zero-setup; swappable to Postgres via one env var |

> **Why SQLite, not PostgreSQL?** For a single-user local project, Postgres adds a
> server, a service and credentials for zero academic benefit. The SQLAlchemy models
> are identical either way — change `DATABASE_URL` and it runs on Postgres unchanged.

---

## Project structure

```
.
├── backend/          FastAPI app, persistence, generation engine, LLM abstraction
│   ├── app/
│   │   ├── api/          route handlers
│   │   ├── core/         config, settings (.env)
│   │   ├── db/           SQLAlchemy session + init
│   │   ├── models/       ORM models (Project, PrototypeVersion)
│   │   ├── schemas/      Pydantic request/response models
│   │   └── services/     generation engine, refinement, demo library
│   └── tests/
├── ml/               trained ML pipeline (classifier, extractor, training scripts + notebook)
├── frontend/         React + TS platform UI (landing, dashboard, create, workspace)
├── docs/             architecture, ML method, API, report material
└── README.md
```

---

## Running it

### 1. Backend + ML  (Python 3.10+)

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Train the ML model once (produces ml/models/*.joblib + metrics):
python -m ml.training.train

# (optional) enable AI refinement — copy and add your key:
copy .env.example .env      # Windows
# then edit .env and set LLM_API_KEY=...

# Start the API:
uvicorn app.main:app --reload --port 8000
```

API docs will be live at http://localhost:8000/docs

### 2. Frontend  (Node 18+)

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173

> The frontend works **without** the backend running — it ships with the same
> generation engine mirrored in TypeScript and the prebuilt demo library, so the
> prototype experience is always available. When the backend *is* running, it uses
> the real trained ML classifier for analysis.

---

## Status

Built as a reduced-but-complete mini-project scope:
**core vertical slice** (landing → create → ML analysis → generation → interactive viewer
+ prebuilt demos) plus **save/load**, **ML insight panel + training metrics**, and
**screen-flow visualization**. Freeform drag-and-drop, undo/redo, and code export are
documented as **Future Scope**.
