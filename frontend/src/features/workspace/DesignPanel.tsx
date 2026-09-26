/**
 * Design panel — surfaces the Design Specification the prototype was compiled
 * from, so the design reasoning is visible (and defensible in the viva). Purely
 * informational; it does not edit the prototype.
 */
import type { DesignSpecification } from "@/types/design";
import { Palette } from "lucide-react";

export function DesignPanel({ design }: { design?: DesignSpecification }) {
  if (!design) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-ink-muted">
        <Palette size={20} className="text-ink-faint" />
        No design specification attached to this prototype.
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      {/* direction + rationale */}
      <section className="p-5">
        <div className="text-sm font-medium text-ink">Design direction</div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-title capitalize text-ink">{design.style}</span>
          <span className="text-xs capitalize text-ink-muted">{design.density} · {design.visualTone}</span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">{design.rationale}</p>
      </section>

      {/* color system */}
      <section className="p-5">
        <div className="text-sm font-medium text-ink">Color system</div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {(["primary", "accent", "background", "surface", "text", "success", "danger"] as const).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="h-5 w-5 shrink-0 rounded-md border border-line" style={{ background: design.tokens.colors[k] }} />
              <span className="truncate text-xs capitalize text-ink-soft">{k}</span>
            </div>
          ))}
        </div>
      </section>

      {/* navigation */}
      <section className="p-5">
        <div className="text-sm font-medium text-ink">Navigation</div>
        <dl className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Pattern</dt>
            <dd className="text-right capitalize text-ink-soft">{design.navigation.pattern}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Primary CTA</dt>
            <dd className="text-right text-ink-soft">{design.navigation.primaryCta}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-ink-muted">Destinations</dt>
            <dd className="text-right capitalize text-ink-soft">
              {design.navigation.primaryDestinations.join(", ") || "single stack"}
            </dd>
          </div>
        </dl>
      </section>

      {/* screens */}
      <section className="p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-ink">Screens</span>
          <span className="font-mono text-xs text-ink-faint">{design.screens.length}</span>
        </div>
        <div className="mt-3 space-y-3.5">
          {design.screens.map((s) => (
            <div key={s.role}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ink">{s.name}</span>
                <span className="shrink-0 text-[11px] capitalize text-ink-faint">{s.layout}</span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{s.purpose}</p>
              {s.primaryCta && (
                <p className="mt-1 text-[11px] text-morph-700">CTA · {s.primaryCta}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* interactions */}
      <section className="p-5">
        <div className="text-sm font-medium text-ink">Interactions</div>
        <p className="mt-2 text-sm capitalize text-ink-soft">{design.interactions.join(", ")}</p>
      </section>
    </div>
  );
}
