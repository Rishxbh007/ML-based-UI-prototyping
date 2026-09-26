"""
Train, COMPARE candidate models, evaluate the winner, and persist it.

Run from the project root:   python -m ml.training.train

Pipeline:
  1. Split the dataset into train / validation / test (stratified).
  2. Fit each candidate model (logreg, svm, nb) on train, score on validation.
  3. Select the best by validation macro-F1 (measured, not assumed).
  4. Refit the winner on train+val and evaluate on the held-out TEST set:
     accuracy, precision, recall, macro-F1, per-class report, confusion matrix.
  5. Error analysis: list every misclassified test sample.
  6. Refit the winner on ALL data (best possible deployed model) and save it.

Produces:
  ml/models/app_type_clf.joblib   the deployed model
  ml/models/metrics.json          full comparison + evaluation for the report

All numbers printed/saved here are real, reproducible output for the "Results",
"Testing" and "Methodology" sections of the report.
"""
from __future__ import annotations
import json
import os
import sys

# Allow "python -m ml.training.train" and direct execution.
_HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.abspath(os.path.join(_HERE, "..", "..")))

from ml.data.dataset import load_dataset, dataset_stats
from ml.pipeline.classifier import build_pipeline, AppTypeClassifier, MODEL_CHOICES

_MODEL_DIR = os.path.abspath(os.path.join(_HERE, "..", "models"))
_METRICS_PATH = os.path.join(_MODEL_DIR, "metrics.json")


def main() -> None:
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import (
        accuracy_score, f1_score, precision_score, recall_score,
        classification_report, confusion_matrix,
    )

    texts, labels = load_dataset()
    stats = dataset_stats()
    print(f"Dataset: {stats['total']} samples, {stats['classes']} classes")
    print(f"Per-class counts: {stats['per_class']}\n")

    labels_sorted = sorted(set(labels))

    # --- 1. train / val / test split (60/20/20), stratified ----------------
    X_tmp, X_test, y_tmp, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_tmp, y_tmp, test_size=0.25, random_state=42, stratify=y_tmp
    )  # 0.25 * 0.8 = 0.2 overall
    print(f"Split -> train={len(X_train)}  val={len(X_val)}  test={len(X_test)}\n")

    # --- 2. compare candidate models on validation ------------------------
    comparison = []
    fitted = {}
    print("Model comparison (validation set):")
    print(f"{'model':<10}{'val_acc':>10}{'val_macroF1':>14}{'cv_acc':>10}")
    for model_id in MODEL_CHOICES:
        pipe = build_pipeline(model_id)
        pipe.fit(X_train, y_train)
        val_pred = pipe.predict(X_val)
        val_acc = accuracy_score(y_val, val_pred)
        val_f1 = f1_score(y_val, val_pred, average="macro")
        # cross-val accuracy on train+val for a more stable read
        cv = cross_val_score(build_pipeline(model_id), X_tmp, y_tmp, cv=5)
        row = {
            "model": model_id,
            "val_accuracy": round(float(val_acc), 4),
            "val_macro_f1": round(float(val_f1), 4),
            "cv_accuracy_mean": round(float(cv.mean()), 4),
            "cv_accuracy_std": round(float(cv.std()), 4),
        }
        comparison.append(row)
        fitted[model_id] = pipe
        print(f"{model_id:<10}{val_acc:>10.3f}{val_f1:>14.3f}{cv.mean():>10.3f}")

    best = max(comparison, key=lambda r: (r["val_macro_f1"], r["val_accuracy"]))
    best_id = best["model"]
    print(f"\nSelected model: {best_id} (best validation macro-F1)\n")

    # --- 3. evaluate winner on held-out TEST (refit on train+val) ---------
    winner = build_pipeline(best_id)
    winner.fit(X_tmp, y_tmp)
    test_pred = winner.predict(X_test)

    test_acc = accuracy_score(y_test, test_pred)
    test_prec = precision_score(y_test, test_pred, average="macro", zero_division=0)
    test_rec = recall_score(y_test, test_pred, average="macro", zero_division=0)
    test_f1 = f1_score(y_test, test_pred, average="macro")

    print("Held-out TEST results for the selected model:")
    print(f"  accuracy : {test_acc:.3f}")
    print(f"  precision: {test_prec:.3f} (macro)")
    print(f"  recall   : {test_rec:.3f} (macro)")
    print(f"  macro F1 : {test_f1:.3f}\n")

    print("Classification report (test):")
    print(classification_report(y_test, test_pred, zero_division=0))

    cm = confusion_matrix(y_test, test_pred, labels=labels_sorted)
    print("Confusion matrix (rows=true, cols=pred):")
    print("labels:", labels_sorted)
    print(cm)

    # --- 4. error analysis -------------------------------------------------
    errors = []
    for text, true, pred in zip(X_test, y_test, test_pred):
        if true != pred:
            errors.append({"text": text, "true": true, "predicted": pred})
    print(f"\nMisclassified test samples: {len(errors)}")
    for e in errors:
        print(f"  [{e['true']} -> {e['predicted']}] {e['text'][:70]}")

    # --- 5. deploy: refit winner on ALL data and save ---------------------
    final = build_pipeline(best_id)
    final.fit(texts, labels)
    clf = AppTypeClassifier(final)
    model_path = clf.save()
    print(f"\nSaved deployed model ({best_id}) -> {model_path}")

    metrics = {
        "dataset_size": stats["total"],
        "classes": labels_sorted,
        "per_class_counts": stats["per_class"],
        "split": {"train": len(X_train), "val": len(X_val), "test": len(X_test)},
        "model_comparison": comparison,
        "selected_model": best_id,
        "test": {
            "accuracy": round(float(test_acc), 4),
            "precision_macro": round(float(test_prec), 4),
            "recall_macro": round(float(test_rec), 4),
            "macro_f1": round(float(test_f1), 4),
        },
        "classification_report": classification_report(
            y_test, test_pred, zero_division=0, output_dict=True
        ),
        "confusion_matrix": {"labels": labels_sorted, "matrix": cm.tolist()},
        "errors": errors,
        # kept for backward-compatibility with the existing ML insight panel:
        "test_accuracy": round(float(test_acc), 4),
        "test_macro_f1": round(float(test_f1), 4),
        "cv_accuracy_mean": best["cv_accuracy_mean"],
        "cv_accuracy_std": best["cv_accuracy_std"],
        "model": f"TF-IDF(1-2gram) + {best_id}",
    }
    os.makedirs(_MODEL_DIR, exist_ok=True)
    with open(_METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved metrics -> {_METRICS_PATH}")


if __name__ == "__main__":
    main()
