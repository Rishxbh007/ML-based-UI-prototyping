/**
 * Phase 2 structure-pipeline provenance (diagnostic only).
 *
 * This module answers a single question WITHOUT changing any behaviour:
 * "between the LLM's proposed screen structure and the screens actually
 *  rendered, where — if anywhere — is structural intelligence lost?"
 *
 * It is a pure, side-effect-free trace over data the pipeline already produces:
 *   User prompt → ML analysis → LLM proposed structure → applyStructure()
 *   validation → deterministic repair → final rendered structure.
 *
 * It is deliberately GENERIC: it computes set differences over ScreenRole names
 * only. It hardcodes NO domain, NO prompt, and NO specific role. It never reads
 * the description text, API keys, or any LLM prompt — only role identifiers and
 * the `source` flag — so it is safe to log.
 */
import type { Prototype, ScreenRole } from "@/types/schema";
import { validateStructureRoles, type StructurePlan } from "./designIntelligence";

/** The seven fields the structure diagnostic surfaces (all role-name lists). */
export interface StructureProvenance {
  /** 7. where the structure came from: the LLM, or the deterministic fallback. */
  source: "llm" | "fallback";
  /** 1. the raw roles the LLM proposed, exactly as received (pre-validation). */
  rawProposed: string[];
  /** 2. the roles that survive applyStructure() (known + landing + ordered). */
  validated: ScreenRole[];
  /** 3. proposed roles removed by validation (unknown vocabulary or duplicates). */
  dropped: string[];
  /** 4. roles determinism ADDED that the LLM did not propose (landing guarantee,
   *     or — on the fallback path — the entire requirement-driven selection). */
  repairAdded: ScreenRole[];
  /** 5. the roles actually compiled into screens in the final prototype. */
  finalRendered: ScreenRole[];
  /** 6. the primary (bottom-nav) destinations of the final prototype. */
  bottomNav: ScreenRole[];
  /** Cross-check: roles in the final render that were NOT in the validated set
   *  (i.e. added AFTER validation, by the generator's navigation repair). This is
   *  expected to be empty — navigation repair adds edges, not screens — so a
   *  non-empty value localises an unexpected source of structure. */
  addedAfterValidation: ScreenRole[];
}

function difference<T extends string>(a: readonly T[], b: readonly string[]): T[] {
  const bset = new Set<string>(b);
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of a) {
    if (!bset.has(x) && !seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

/**
 * Build the provenance trace from data the CreatePage flow already has in hand:
 * the raw proposed roles + source (from the structure client call), the validated
 * plan that was handed to generate(), and the resulting prototype.
 *
 * `plan` is the validated StructurePlan actually passed to generate() (or null on
 * the fallback path). `proposedRoles` is the pre-validation LLM proposal (or [] ).
 */
export function buildStructureProvenance(args: {
  appType: string;
  source: "llm" | "fallback";
  proposedRoles: string[];
  plan: StructurePlan | null;
  prototype: Prototype;
}): StructureProvenance {
  const { appType, source, proposedRoles, plan, prototype } = args;

  const validated: ScreenRole[] = plan ? validateStructureRoles(appType, plan) : [];
  const finalRendered: ScreenRole[] = prototype.screens.map((s) => s.role);
  const bottomNav: ScreenRole[] = prototype.design?.navigation.primaryDestinations ?? [];

  const dropped = difference(proposedRoles, validated);
  // Everything in the final render the LLM did not propose is a deterministic
  // addition (landing guarantee on the LLM path; the whole set on the fallback path).
  const repairAdded = difference(finalRendered, proposedRoles);
  const addedAfterValidation = difference(finalRendered, validated);

  return {
    source,
    rawProposed: proposedRoles.slice(),
    validated,
    dropped,
    repairAdded,
    finalRendered,
    bottomNav,
    addedAfterValidation,
  };
}

/** A compact, human-readable rendering of the provenance for a console trace. */
export function formatStructureProvenance(p: StructureProvenance): string {
  const list = (xs: readonly string[]) => (xs.length ? xs.join(" → ") : "(none)");
  // "added after validation" is only meaningful — and only a red flag — when a
  // real plan was validated (LLM path). On the fallback path `validated` is empty
  // by design, so the final set legitimately equals "added after validation";
  // that is expected, not a problem.
  const lastLine =
    p.validated.length > 0 && p.addedAfterValidation.length > 0
      ? `  ! added AFTER validation (unexpected — generator introduced roles): ${list(p.addedAfterValidation)}`
      : p.validated.length > 0
        ? `  ✓ nothing added after validation (final == validated)`
        : `  · no plan validated (deterministic fallback path)`;
  return [
    `[Morph] structure provenance (source=${p.source})`,
    `  1. raw LLM proposed  : ${list(p.rawProposed)}`,
    `  2. validated         : ${list(p.validated)}`,
    `  3. dropped by valid. : ${list(p.dropped)}`,
    `  4. added by repair   : ${list(p.repairAdded)}`,
    `  5. final rendered    : ${list(p.finalRendered)}`,
    `  6. bottom-nav        : ${list(p.bottomNav)}`,
    lastLine,
  ].join("\n");
}
