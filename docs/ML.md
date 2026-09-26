# The Machine Learning Method (viva-ready)

This is the honest, defensible explanation of the ML/NLP in Morph. If an
examiner asks "where is the machine learning?", this document is your answer.

---

## 1. The problem, framed as ML

**Input:** a free-text app description.
**Goal:** produce a structured understanding — *app type, features, actions,
required screens* — that a deterministic engine can turn into a prototype.

We decompose this into tasks, and use ML/NLP where it genuinely helps:

| Task | Approach | Learned or rule? |
|---|---|---|
| App-type classification | **TF-IDF + Logistic Regression** | **Trained ML** |
| NLP preprocessing | Tokenize, lemmatize, NER (spaCy) | NLP |
| Feature extraction | Semantic similarity (embeddings) + keyword rules | Hybrid |
| Action extraction | Lexicon over lemmas | Rule |
| Screen inference | Feature → screen mapping | Rule |
| UI generation | Deterministic engine | Rule |

This hybrid is deliberate. Classification is a real supervised learning problem
with a measurable accuracy; generation is a mapping problem where determinism
gives reliability. We do **not** pretend the rule-based parts are ML.

---

## 2. The trained model in detail

**Pipeline:** `TfidfVectorizer(ngram_range=(1,2))` → `LogisticRegression`.

- **Preprocessing:** each description is lemmatized and stripped of stopwords
  (`ml/pipeline/preprocessing.py`) before vectorization.
- **Features:** TF-IDF over word uni- and bi-grams captures phrases like
  "add to cart" or "transfer money" that signal an app type.
- **Classifier:** multinomial Logistic Regression — a strong, *interpretable*
  linear baseline. You can inspect per-class feature weights to explain *why* a
  description was classified a certain way.
- **Classes (8):** food-delivery, fitness, banking, ecommerce, education,
  social, travel, productivity.
- **Output:** a predicted label **and a full probability distribution**, which
  the UI shows as confidence bars — so the model's uncertainty is visible.

**Why this model and not a deep network / big LLM?**
- The dataset is small and the classes are well-separated by vocabulary — a
  linear model is the right tool and won't overfit the way a large model would.
- It trains in under a second on a laptop, no GPU, fully offline.
- It is interpretable and reproducible, which matters for an academic defense.
- A large LLM would make classification a black box and remove the "trained
  model" you can point to.

---

## 3. Training & evaluation (reproducible results)

Run:

```bash
python -m ml.training.train
```

This performs:
- **5-fold cross-validation** on the full dataset (robust for small data).
- A **stratified 75/25 train/test split** with a held-out evaluation.
- Prints and saves **accuracy, macro-F1, a full classification report, and a
  confusion matrix** to `ml/models/metrics.json`.

Those numbers (and the confusion matrix) are exactly what goes in the
**Results** and **Testing** sections of the report — they are real output, not
invented. The Workspace "ML insight" panel also displays them live when the
backend is running.

> Note: run training on your machine after `pip install -r backend/requirements.txt`.
> Until then, the system uses a transparent keyword fallback that is clearly
> labeled as such in the UI (`pipeline.classifier` field).

---

## 4. Feature & action extraction

`ml/pipeline/extraction.py` combines two signals:

1. **Semantic similarity (ML):** if `sentence-transformers` is installed, the
   description and each canonical feature phrase are embedded and compared by
   cosine similarity — this catches features described in words that don't
   literally match a keyword.
2. **Keyword rules:** a curated lexicon over lemmas — always available, reliable.

Each returned feature is tagged with its **source** (`ml` or `rule`), shown in
the insight panel, so the contribution of each mechanism is transparent.

---

## 5. The optional LLM — exactly what it does

The LLM (if a key is configured) has **one narrow job**: translate a free-text
*refinement* instruction ("make it premium dark", "add a settings screen") into
a structured `RefinementCommand`. It does **not** generate UI and is **not**
required — a rule-based parser handles the same job offline.

This keeps the LLM's role crisp and honest: **natural-language → structured
command**; the deterministic engine then applies the command.

---

## 6. How to demonstrate the ML in a viva

1. Open **Create**, type a description, and watch the pipeline run.
2. In the **Workspace → ML insight** tab, show:
   - the predicted app type + the confidence distribution (the classifier),
   - extracted features tagged ML vs rule,
   - the pipeline field naming which engine ran (spaCy? trained model?),
   - the trained model's accuracy + dataset size (from `metrics.json`).
3. Run `python -m ml.training.train` live to show real training output and the
   confusion matrix.
4. Change a word in the description ("shopping" → "workout") and show the
   prediction change — evidence the model responds to language, not templates.

---

## 7. Limitations & future scope (be honest)

- Small dataset → strong on the 8 covered domains, weaker on novel ones. Future
  scope: expand the corpus, add more classes.
- Screen inference is rule-based; a future version could learn screen sets from
  a dataset of real app flows.
- The embedding extractor is optional; enabling `sentence-transformers` improves
  recall of implicitly-described features.
