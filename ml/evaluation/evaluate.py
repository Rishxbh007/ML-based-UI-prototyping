"""
Evaluate the upgraded pipeline on UNSEEN requirements and compare old vs new.

Run from the project root:   python -m ml.evaluation.evaluate

Reports:
  1. Domain classification: OLD (keyword baseline) vs NEW (trained model)
     — accuracy, macro-F1, and accuracy broken down by difficulty.
  2. Qualitative understanding gains: entities, relationships and goals the
     old keyword-only pipeline could not produce.

This is the evidence for "what actually improved" in the report.
"""
from __future__ import annotations
import os
import sys
from collections import defaultdict

_HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.abspath(os.path.join(_HERE, "..", "..")))

from ml.evaluation.eval_set import load_eval
from ml.pipeline.preprocessing import preprocess, spacy_available
from ml.pipeline.analyze import _fallback_app_type
from ml.pipeline.classifier import AppTypeClassifier
from ml.pipeline.analyze import analyze


def _domain_metrics(y_true, y_pred):
    from sklearn.metrics import accuracy_score, f1_score
    return (
        round(float(accuracy_score(y_true, y_pred)), 4),
        round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4),
    )


def main() -> None:
    data = load_eval()
    print(f"Evaluation set: {len(data)} unseen requirements\n")
    print(f"spaCy available: {spacy_available()}")
    trained = AppTypeClassifier.is_trained()
    print(f"Trained model present: {trained}\n")

    y_true = [d["label"] for d in data]

    # OLD baseline: keyword-only domain guess
    old_pred = [_fallback_app_type(preprocess(d["text"]).tokens)["label"] for d in data]

    # RAW classifier label (before domain reasoning) — for reference.
    raw_pred = []
    # NEW = the full pipeline's reasoned primary domain (what the system reports).
    new_pred = []
    for d in data:
        res = analyze(d["text"])
        new_pred.append(res["appType"])  # reasoned primary
        raw_pred.append(res["pipeline"].get("classifier_label", res["appType"]))

    old_acc, old_f1 = _domain_metrics(y_true, old_pred)
    raw_acc, raw_f1 = _domain_metrics(y_true, raw_pred)
    new_acc, new_f1 = _domain_metrics(y_true, new_pred)

    print("=== Domain accuracy: OLD keyword vs RAW classifier vs NEW reasoned ===")
    print(f"{'metric':<12}{'OLD':>9}{'RAW clf':>10}{'NEW':>9}")
    print(f"{'accuracy':<12}{old_acc:>9.3f}{raw_acc:>10.3f}{new_acc:>9.3f}")
    print(f"{'macro F1':<12}{old_f1:>9.3f}{raw_f1:>10.3f}{new_f1:>9.3f}\n")

    print("=== Domain classification: OLD (keyword) vs NEW (reasoned) ===")
    print(f"{'metric':<16}{'OLD':>10}{'NEW':>10}{'delta':>10}")
    print(f"{'accuracy':<16}{old_acc:>10.3f}{new_acc:>10.3f}{new_acc - old_acc:>+10.3f}")
    print(f"{'macro F1':<16}{old_f1:>10.3f}{new_f1:>10.3f}{new_f1 - old_f1:>+10.3f}\n")

    # per-difficulty accuracy (new pipeline)
    by_diff = defaultdict(lambda: [0, 0])
    for d, p in zip(data, new_pred):
        by_diff[d["difficulty"]][1] += 1
        if p == d["label"]:
            by_diff[d["difficulty"]][0] += 1
    print("NEW accuracy by difficulty:")
    for diff, (correct, total) in by_diff.items():
        print(f"  {diff:<12} {correct}/{total}  ({correct / total:.0%})")

    # show misclassifications
    print("\nNEW misclassifications:")
    for d, p in zip(data, new_pred):
        if p != d["label"]:
            print(f"  [{d['label']} -> {p}] ({d['difficulty']}) {d['text'][:60]}")

    # ---- coreference + goal extraction checks ---------------------------
    print("\n=== Coreference & goal extraction (pronoun / multi_action cases) ===")
    _PRON = {"it", "them", "they", "this", "that", "him", "her"}
    for d in data:
        if d["difficulty"] not in ("pronoun", "multi_action"):
            continue
        spec = analyze(d["text"])["applicationSpec"]
        ents = [e["name"] for e in spec["entities"]]
        goals = [g["goal"] for g in spec["goals"]]
        pron_leak = [e for e in ents if e in _PRON]
        print(f"\n  \"{d['text']}\"  [{d['difficulty']}]")
        print(f"     entities: {ents}  pronoun_leak={pron_leak}")
        print(f"     goals ({len(goals)}): {goals}")

    # ---- multi-domain understanding on the ambiguous cases --------------
    print("\n=== Multi-domain understanding (ambiguous / cross-domain cases) ===")
    for d in data:
        if d["difficulty"] not in ("ambiguous", "multi_domain"):
            continue
        spec = analyze(d["text"])["applicationSpec"]
        caps = [c["capability"] for c in spec["capabilities"]]
        sec = spec["secondary_domain"]["label"] if spec["secondary_domain"] else "-"
        print(f"\n  \"{d['text']}\"")
        print(f"     primary domain : {spec['primary_domain']} (conf {spec['confidence']['domain']})")
        print(f"     secondary domain: {sec}   multi_domain={spec['multi_domain']}")
        print(f"     intent          : {spec['intent']}")
        print(f"     capabilities    : {caps}")
        print(f"     screens         : {[s['role'] for s in spec['screens']]}")

    # ---- qualitative understanding gains --------------------------------
    print("\n=== Qualitative understanding gains (new pipeline) ===")
    samples = [
        "users can book appointments with doctors and receive reminders before their appointments",
        "users can book fitness classes and pay for them",
        "users can browse restaurants, order food, track delivery and rate restaurants",
    ]
    for text in samples:
        res = analyze(text)
        spec = res["applicationSpec"]
        print(f"\nRequirement: {text}")
        print(f"  primary domain: {spec['primary_domain']} (conf {spec['confidence']['domain']})  multi_domain={spec['multi_domain']}")
        print(f"  intent: {spec['intent']}   capabilities: {[c['capability'] for c in spec['capabilities']]}")
        print(f"  entities: {[e['name'] for e in spec['entities']]}")
        print(f"  relationships:")
        for r in spec["relationships"]:
            print(f"     {r['source']} --{r['relation']}--> {r['target']}  [{r['kind']}]")
        print(f"  goals: {[g['goal'] for g in spec['goals']]}")
        print(f"  screens: {[s['role'] for s in spec['screens']]}")
        print(f"  overall confidence: {spec['confidence']['overall']}")

    print("\nOLD keyword pipeline produced: a single forced domain + features + a "
          "fixed action list (no intent, no secondary capabilities, no entities, "
          "no relationships, no goals, no application specification).")


if __name__ == "__main__":
    main()
