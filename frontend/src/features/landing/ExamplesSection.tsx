/**
 * Interactive examples — real generated demo prototypes the visitor can click
 * through, each inside a phone. Uses the same engine + PrototypePlayer as the
 * product, so "examples" are genuinely live, not screenshots. Alongside each we
 * surface the requirement it came from and what the model understood — all read
 * from the prototype's stored analysis (no fabricated numbers).
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { buildDemoProjects } from "@/data/demos";
import { PrototypePlayer } from "@/components/prototype/PrototypePlayer";

export function ExamplesSection() {
  const demos = useMemo(() => buildDemoProjects(), []);
  const [active, setActive] = useState(0);
  const demo = demos[active];
  const analysis = demo.prototype.analysis;
  const features = analysis?.features.slice(0, 5).map((f) => f.name) ?? [];
  const confidence = analysis ? Math.round(analysis.appTypeConfidence * 100) : null;

  return (
    <div>
      {/* Quiet selector — text, not pills. */}
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 border-b border-line pb-5">
        {demos.map((d, i) => (
          <button
            key={d.id}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className={[
              "text-[15px] transition-colors",
              i === active ? "font-medium text-ink" : "text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="grid items-center gap-12 pt-10 lg:grid-cols-[1fr_auto] lg:gap-20">
        <motion.div
          key={demo.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0 max-w-md"
        >
          <p className="text-sm text-ink-muted">The requirement</p>
          <p className="mt-3 text-lg leading-relaxed text-ink">{demo.description}</p>

          <dl className="mt-9 grid grid-cols-2 gap-x-8 gap-y-7 border-t border-line pt-9">
            <div>
              <dt className="text-sm text-ink-muted">Understood as</dt>
              <dd className="mt-1.5 font-display text-title capitalize text-ink">
                {analysis?.appType ?? demo.prototype.appType}
              </dd>
              {confidence !== null && (
                <dd className="mt-1 font-mono text-xs text-morph-600">{confidence}% confidence</dd>
              )}
            </div>
            <div>
              <dt className="text-sm text-ink-muted">Generated</dt>
              <dd className="mt-1.5 font-display text-title text-ink">
                {demo.prototype.screens.length} screens
              </dd>
              <dd className="mt-1 text-xs text-ink-muted">fully navigable</dd>
            </div>
          </dl>

          {features.length > 0 && (
            <div className="mt-7">
              <div className="text-sm text-ink-muted">Key features</div>
              <p className="mt-2 text-sm capitalize text-ink-soft">{features.join(", ")}</p>
            </div>
          )}
        </motion.div>

        <motion.div
          key={demo.id + "-phone"}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto"
        >
          <PrototypePlayer prototype={demo.prototype} mode="play" scale={0.95} />
        </motion.div>
      </div>
    </div>
  );
}
