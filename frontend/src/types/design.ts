/**
 * Design Specification — the structured description of HOW the generated app
 * should look and behave. It is the bridge between the Application
 * Specification ("what app does the user want") and the Renderer ("turn design
 * into React"), so the renderer never has to invent major design decisions.
 *
 *   Application Specification  ->  Design Intelligence  ->  Design Specification
 *                                                             |
 *                                                             v
 *                                                          Renderer (compile
 *                                                          to the Prototype
 *                                                          schema -> React)
 */
import type { ComponentType, DesignTokens, ScreenRole } from "./schema";

export type DesignStyleId =
  | "minimal"
  | "professional"
  | "premium-dark"
  | "energetic"
  | "editorial"
  | "data-focused"
  | "playful";

export type NavPattern = "bottom-tab" | "stack";

export type ScreenLayout =
  | "feed" // scrollable hub of cards/sections (home, discovery)
  | "list" // a browseable list/catalog
  | "detail" // a single item with a primary action
  | "form" // inputs + submit (login, transfer, add)
  | "dashboard" // stats/metrics-first overview
  | "stepper" // a linear multi-step flow (cart -> checkout)
  | "confirmation" // success/receipt screen
  | "profile"; // account / settings

export type ScreenState = "empty" | "loading" | "error" | "success" | "confirmation";

/** Design decision for one screen — the renderer executes, it does not decide. */
export interface DesignScreen {
  role: ScreenRole;
  name: string;
  /** why this screen exists (traceable to the requirement) */
  purpose: string;
  layout: ScreenLayout;
  /** the component types this screen should be composed from */
  components: ComponentType[];
  /** the single most important action on the screen */
  primaryCta?: string;
  /** supporting actions */
  secondaryActions: string[];
  /** which states this screen meaningfully has (drives feedback design) */
  states: ScreenState[];
  /** screens this one can navigate to (by role) */
  navTargets: ScreenRole[];
  /** whether this screen participates in the primary (bottom) navigation */
  isPrimaryDestination: boolean;
}

export interface DesignSpecification {
  style: DesignStyleId;
  /** short human description of the visual tone, e.g. "warm, appetite-driven" */
  visualTone: string;
  /** why this design direction was chosen (traceable, for the viva) */
  rationale: string;

  /** the concrete design system the renderer applies */
  tokens: DesignTokens;
  density: "comfortable" | "compact";

  navigation: {
    pattern: NavPattern;
    /** ordered roles that appear in the primary navigation */
    primaryDestinations: ScreenRole[];
    /** the app's single most important call to action */
    primaryCta: string;
  };

  screens: DesignScreen[];

  /** interaction patterns the prototype should support (justified ones only) */
  interactions: string[];

  /** capabilities that shaped the design (from the Application Specification) */
  capabilities: string[];
}
