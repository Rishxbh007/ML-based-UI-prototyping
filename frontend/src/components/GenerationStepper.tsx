/**
 * The "intelligent generation" experience — an animated checklist that mirrors
 * the real pipeline stages (analysis -> features -> screens -> components ->
 * navigation -> build). Purely presentational; the parent advances `active`.
 */
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Spinner } from "@/components/ui/primitives";

export const GENERATION_STEPS = [
  "Analyzing requirements",
  "Identifying application type",
  "Extracting features & actions",
  "Designing screens",
  "Mapping components",
  "Creating navigation",
  "Building prototype",
] as const;

export function GenerationStepper({ active, compact = false }: { active: number; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {GENERATION_STEPS.map((label, i) => {
        const state = i < active ? "done" : i === active ? "active" : "pending";
        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: state === "pending" ? 0.4 : 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                state === "done"
                  ? "border-transparent bg-ink text-white"
                  : state === "active"
                  ? "border-morph-300 bg-morph-50"
                  : "border-line text-transparent",
              ].join(" ")}
            >
              {state === "done" ? <Check size={12} /> : state === "active" ? <Spinner className="h-3 w-3" /> : null}
            </span>
            <span
              className={[
                compact ? "text-sm" : "text-[15px]",
                state === "done" ? "text-ink-soft" : state === "active" ? "font-medium text-ink" : "text-ink-faint",
              ].join(" ")}
            >
              {label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
