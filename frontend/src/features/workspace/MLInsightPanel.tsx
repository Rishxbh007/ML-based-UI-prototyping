/**
 * Intelligence inspector — makes the machine-learning contribution visible and
 * explainable (for the viva) without ever reading as a debug console. Shows the
 * classifier's prediction and honest confidence distribution, the evidence the
 * decision rested on, extracted entities/features (ML vs rule), predicted
 * screens, the pipeline that ran, and — when the backend is live — the trained
 * model's held-out results. Confidence values are shown exactly as produced;
 * nothing here invents or rescales them.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import type { RequirementAnalysis } from "@/types/schema";
import { mlMetrics } from "@/api/client";

interface MlMetrics {
  test_accuracy?: number;
  test_macro_f1?: number;
  cv_accuracy_mean?: number;
  dataset_size?: number;
  model?: string;
}

export function MLInsightPanel({ analysis }: { analysis?: RequirementAnalysis }) {
  const [metrics, setMetrics] = useState<MlMetrics | null>(null);

  useEffect(() => {
    mlMetrics().then((m) => setMetrics((m as MlMetrics) ?? null)).catch(() => setMetrics(null));
  }, []);

  if (!analysis) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-ink-muted">
        <Info size={20} className="text-ink-faint" />
        This prototype has no stored analysis. Generate one from a description to see the ML breakdown.
      </div>
    );
  }

  const topProbs = analysis.appTypeProbabilities.slice(0, 5);
  const cls = analysis.classification;
  const entities = analysis.entities.slice(0, 8);

  return (
    <div className="divide-y divide-line">
      {/* Domain + confidence */}
      <section className="p-5">
        <div className="text-sm text-ink-muted">Predicted domain</div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="font-display text-title capitalize text-ink">{analysis.appType}</span>
          <span className="font-mono text-sm text-morph-600">
            {Math.round(analysis.appTypeConfidence * 100)}%
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {topProbs.map((p, i) => (
            <div key={p.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 truncate text-xs capitalize text-ink-soft">{p.label}</span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, Math.round(p.score * 100))}%` }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className={i === 0 ? "absolute inset-y-0 left-0 rounded-full bg-morph-500" : "absolute inset-y-0 left-0 rounded-full bg-ink/20"}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-[11px] text-ink-muted">
                {Math.round(p.score * 100)}%
              </span>
            </div>
          ))}
        </div>

        {cls && (
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            Decision{" "}
            <span className="font-mono text-ink-soft">{cls.decision}</span> — top{" "}
            <span className="font-mono text-ink-soft">{Math.round(cls.topProbability * 100)}%</span>, margin{" "}
            <span className="font-mono text-ink-soft">{Math.round(cls.margin * 100)}%</span>, recognized{" "}
            <span className="font-mono text-ink-soft">{cls.evidence.recognized}</span> of{" "}
            <span className="font-mono text-ink-soft">{cls.evidence.analyzed}</span> terms.
          </p>
        )}
      </section>

      {/* Entities */}
      {entities.length > 0 && (
        <section className="p-5">
          <div className="text-sm font-medium text-ink">Detected entities</div>
          <div className="mt-3 space-y-1.5">
            {entities.map((e, i) => (
              <div key={`${e.text}-${i}`} className="flex items-baseline justify-between gap-3">
                <span className="text-sm capitalize text-ink-soft">{e.text}</span>
                <span className="font-mono text-[11px] text-ink-faint">{e.kind}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="p-5">
        <div className="text-sm font-medium text-ink">Extracted features</div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {analysis.features.slice(0, 14).map((f) => (
            <span
              key={f.name}
              className="text-sm capitalize text-ink-soft"
              title={`${Math.round(f.confidence * 100)}% · ${f.source === "ml" ? "semantic (ML)" : "keyword rule"}`}
            >
              {f.name}
              <span className={["ml-1 font-mono text-[10px]", f.source === "ml" ? "text-teal-600" : "text-ink-faint"].join(" ")}>
                {f.source}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* Actions */}
      {analysis.actions.length > 0 && (
        <section className="p-5">
          <div className="text-sm font-medium text-ink">Detected actions</div>
          <p className="mt-2 text-sm capitalize text-ink-soft">{analysis.actions.join(", ")}</p>
        </section>
      )}

      {/* Predicted screens */}
      {analysis.inferredScreens.length > 0 && (
        <section className="p-5">
          <div className="text-sm font-medium text-ink">Predicted screens</div>
          <div className="mt-3 space-y-2.5">
            {analysis.inferredScreens.map((s, i) => (
              <div key={`${s.role}-${i}`}>
                <div className="text-sm capitalize text-ink">{s.role}</div>
                <div className="text-xs leading-relaxed text-ink-muted">{s.reason}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Target users */}
      <section className="p-5">
        <div className="text-sm font-medium text-ink">Target users</div>
        <p className="mt-1.5 text-sm text-ink-soft">{analysis.targetUsers}</p>
      </section>

      {/* Pipeline honesty */}
      <section className="p-5">
        <div className="text-sm font-medium text-ink">Pipeline</div>
        <dl className="mt-3 space-y-1.5">
          <Row k="Preprocessing" v={analysis.pipeline.preprocessing} />
          <Row k="Classifier" v={analysis.pipeline.classifier} />
          <Row k="Extraction" v={analysis.pipeline.extraction} />
        </dl>
      </section>

      {/* Trained-model metrics (backend only) */}
      {metrics && (
        <section className="p-5">
          <div className="text-sm font-medium text-ink">Trained model — held-out results</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="Test accuracy" value={pct(metrics.test_accuracy)} />
            <Stat label="Macro F1" value={pct(metrics.test_macro_f1)} />
            <Stat label="CV accuracy" value={pct(metrics.cv_accuracy_mean)} />
            <Stat label="Dataset" value={metrics.dataset_size != null ? `${metrics.dataset_size}` : "—"} />
          </div>
          {metrics.model && <p className="mt-3 font-mono text-[11px] text-ink-faint">{metrics.model}</p>}
        </section>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-ink-muted">{k}</dt>
      <dd className="text-right font-mono text-[11px] text-ink-soft">{v}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-0.5 font-display text-title text-ink">{value}</div>
    </div>
  );
}

function pct(n?: number) {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}
