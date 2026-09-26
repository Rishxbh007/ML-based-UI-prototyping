/**
 * Small shared UI primitives for the platform chrome.
 * (Button lives in its own file; these are the lightweight rest.)
 *
 * Restraint by design: no card kit, no eyebrow labels. Structure comes from
 * hairlines, space and type — these are only the few atoms worth sharing.
 */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning";
  className?: string;
}) {
  const tones = {
    neutral: "border-line text-ink-muted",
    accent: "border-morph-200 text-morph-700",
    success: "border-success/25 text-success",
    warning: "border-warning/25 text-warning",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A hairline-bounded surface. Used sparingly — most sections need no box. */
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white", className)} {...props}>
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-morph-500 border-t-transparent",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line-strong bg-surface-raised px-1 font-mono text-[10px] leading-none text-ink-muted">
      {children}
    </kbd>
  );
}
