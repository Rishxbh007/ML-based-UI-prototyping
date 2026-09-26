/**
 * Design Intelligence.
 *
 *   deriveDesignSpec(analysis, input) -> DesignSpecification
 *
 * This is the layer the new phase is about. It REASONS from the Application
 * Specification (domain, features, actions, capabilities) to a coherent Design
 * Specification — the visual system, the requirement-driven screen set, and the
 * per-screen layout / components / CTA / states — WITHOUT jumping straight to
 * React and without domain->template lookups.
 *
 * Key rules (per the phase brief):
 *   - Screens are derived from features/capabilities, not padded with generic
 *     ones. Login/Signup/Profile/Checkout/Search/Cart appear ONLY when the
 *     requirement supports them.
 *   - The visual style is chosen to support the app's purpose, not at random.
 *   - It is deterministic: same input -> same design.
 */
import type {
  ComponentType,
  CreateProjectInput,
  DesignTokens,
  RequirementAnalysis,
  ScreenRole,
} from "@/types/schema";
import type {
  DesignScreen,
  DesignSpecification,
  DesignStyleId,
  NavPattern,
  ScreenLayout,
  ScreenState,
} from "@/types/design";
import { THEME_PRESETS, DEFAULT_TOKENS } from "@/data/themePresets";

// ---------------------------------------------------------------------------
// Feature helpers
// ---------------------------------------------------------------------------
const PRESENT_THRESHOLD = 0.6;
// authentication is added softly by the analyzer; require a real signal for it
const AUTH_THRESHOLD = 0.6;

function featureMap(analysis: RequirementAnalysis): Map<string, number> {
  const m = new Map<string, number>();
  for (const f of analysis.features) m.set(f.name, Math.max(m.get(f.name) ?? 0, f.confidence));
  return m;
}

function has(feat: Map<string, number>, name: string, threshold = PRESENT_THRESHOLD): boolean {
  return (feat.get(name) ?? 0) >= threshold;
}

// ---------------------------------------------------------------------------
// 1. Visual style selection (purpose-driven, deterministic)
// ---------------------------------------------------------------------------
const DASHBOARD_DOMAINS = new Set(["fitness", "banking", "productivity"]);

interface StylePick {
  style: DesignStyleId;
  tone: string;
  presetKey: string;
  rationale: string;
}

function pickStyle(appType: string, requested: string): StylePick {
  const s = (requested || "").toLowerCase();

  // explicit user direction wins when given
  if (s.includes("dark") || s.includes("premium")) {
    return { style: "premium-dark", tone: "premium, focused, high-contrast", presetKey: "premium-dark",
      rationale: "the requested style asked for a premium/dark direction" };
  }
  if (s.includes("minimal") || s.includes("clean")) {
    return { style: "minimal", tone: "calm, restrained, content-first", presetKey: "minimal-fresh",
      rationale: "the requested style asked for a minimal/clean direction" };
  }

  // otherwise derive from the domain's purpose (palettes verified via the
  // ui-ux-pro-max design database — see themePresets.ts headers)
  switch (appType) {
    case "banking":
      return { style: "data-focused", tone: "trustworthy, precise, secure", presetKey: "trust-finance",
        rationale: "finance apps prioritise trust and legibility of numbers (navy + gold, compact)" };
    case "fitness":
      return { style: "energetic", tone: "motivating, bold, progress-driven", presetKey: "energetic-fitness",
        rationale: "fitness apps benefit from energetic, progress-forward visuals on a dark surface" };
    case "food-delivery":
      return { style: "energetic", tone: "warm, appetite-driven", presetKey: "warm-commerce",
        rationale: "food apps rely on warm, appetising imagery and clear ordering CTAs" };
    case "ecommerce":
      return { style: "minimal", tone: "clean, product-forward", presetKey: "warm-commerce",
        rationale: "commerce apps keep products the hero with minimal chrome" };
    case "education":
      return { style: "minimal", tone: "calm, focused, readable", presetKey: "calm-education",
        rationale: "learning apps prioritise readable, distraction-free content" };
    case "social":
      return { style: "premium-dark", tone: "immersive, media-first", presetKey: "premium-dark",
        rationale: "social feeds feel best with an immersive, media-first surface" };
    case "media":
      return { style: "premium-dark", tone: "immersive, vibrant, content-forward", presetKey: "vibrant-media",
        rationale: "media/streaming apps use a dark stage so thumbnails and video pop" };
    case "travel":
      return { style: "editorial", tone: "aspirational, imagery-led", presetKey: "editorial-travel",
        rationale: "travel apps lean editorial and imagery-led (sky blue + adventure orange) to inspire" };
    case "healthcare":
      return { style: "professional", tone: "calm, reassuring, trustworthy", presetKey: "calm-health",
        rationale: "healthcare apps use calm cyan + health green to feel safe and reduce anxiety" };
    case "booking":
      return { style: "professional", tone: "clear, efficient, dependable", presetKey: "flat-booking",
        rationale: "booking apps stay flat and legible so availability and times read at a glance" };
    default:
      return { style: "professional", tone: "clear, efficient", presetKey: "minimal-fresh",
        rationale: "a clear, efficient direction suits a utility/productivity app" };
  }
}

// ---------------------------------------------------------------------------
// 2. Requirement-driven screen derivation
// ---------------------------------------------------------------------------
const PRIMARY_CTA: Record<string, string> = {
  "food-delivery": "Place order",
  ecommerce: "Buy now",
  fitness: "Start workout",
  banking: "Send money",
  education: "Enroll",
  social: "Create post",
  media: "Play now",
  travel: "Book now",
  healthcare: "Book appointment",
  booking: "Reserve",
  productivity: "Add task",
};

const NAME_OVERRIDES: Record<string, Partial<Record<ScreenRole, string>>> = {
  "food-delivery": { home: "Home", list: "Restaurants", details: "Restaurant", cart: "Cart", checkout: "Checkout", confirmation: "Order Placed", tracking: "Track Order" },
  ecommerce: { home: "Shop", list: "Products", details: "Product", cart: "Bag", confirmation: "Order Placed", tracking: "Track Order" },
  fitness: { dashboard: "Home", list: "Workouts", details: "Workout", confirmation: "Done" },
  banking: { dashboard: "Home", list: "Transactions", details: "Transfer", checkout: "Send", confirmation: "Sent" },
  education: { home: "Learn", list: "Courses", details: "Course", confirmation: "Enrolled" },
  social: { home: "Feed", list: "Explore", details: "Post", detailSecondary: "Chat" },
  media: { home: "Home", list: "Library", details: "Now Playing", search: "Search" },
  travel: { home: "Explore", list: "Results", details: "Stay", checkout: "Booking", confirmation: "Booked" },
  healthcare: { home: "Home", list: "Doctors", details: "Doctor", checkout: "Confirm", confirmation: "Booked" },
  booking: { home: "Discover", list: "Availability", details: "Details", checkout: "Confirm", confirmation: "Reserved" },
  productivity: { dashboard: "Today", list: "Tasks", details: "Task", confirmation: "Added" },
};

const DEFAULT_NAMES: Record<ScreenRole, string> = {
  splash: "Splash", onboarding: "Onboarding", login: "Login", signup: "Sign Up",
  home: "Home", dashboard: "Home", search: "Search", list: "Browse", details: "Details",
  detailSecondary: "Messages", cart: "Cart", checkout: "Checkout", confirmation: "Confirmed",
  tracking: "Track Order", profile: "Profile", settings: "Settings", generic: "Screen",
};

function nameFor(appType: string, role: ScreenRole): string {
  return NAME_OVERRIDES[appType]?.[role] ?? DEFAULT_NAMES[role];
}

const LAYOUT_FOR: Record<ScreenRole, ScreenLayout> = {
  splash: "confirmation", onboarding: "feed", login: "form", signup: "form",
  home: "feed", dashboard: "dashboard", search: "list", list: "list",
  details: "detail", detailSecondary: "form", cart: "stepper", checkout: "stepper",
  confirmation: "confirmation", tracking: "feed", profile: "profile", settings: "profile", generic: "feed",
};

const COMPONENTS_FOR: Record<ScreenRole, ComponentType[]> = {
  splash: ["banner", "text", "button"],
  onboarding: ["banner", "heading", "text", "button"],
  login: ["appbar", "heading", "input", "button"],
  signup: ["appbar", "heading", "input", "button"],
  home: ["appbar", "heading", "searchBar", "list", "banner", "bottomNav"],
  dashboard: ["appbar", "stat", "progress", "list", "bottomNav"],
  search: ["appbar", "searchBar", "list"],
  list: ["appbar", "searchBar", "list"],
  details: ["appbar", "image", "heading", "ratingStars", "priceTag", "button"],
  detailSecondary: ["appbar", "list", "input"],
  cart: ["appbar", "list", "stat", "button"],
  checkout: ["appbar", "card", "stat", "button"],
  confirmation: ["banner", "heading", "text", "button"],
  tracking: ["appbar", "banner", "progress", "list", "button"],
  profile: ["appbar", "avatar", "heading", "list", "toggle", "button", "bottomNav"],
  settings: ["appbar", "toggle", "list", "button"],
  generic: ["appbar", "heading", "list"],
};

function statesFor(role: ScreenRole): ScreenState[] {
  switch (role) {
    case "list": case "search": case "home": case "dashboard": return ["loading", "empty"];
    case "login": case "signup": case "checkout": case "detailSecondary": return ["error", "loading"];
    case "confirmation": return ["success", "confirmation"];
    case "tracking": return ["loading"];
    case "details": return ["loading"];
    default: return [];
  }
}

const SCREEN_ORDER: ScreenRole[] = [
  "splash", "onboarding", "login", "signup", "home", "dashboard",
  "search", "list", "details", "detailSecondary", "cart", "checkout",
  "confirmation", "tracking", "profile", "settings",
];

interface SelectedScreen { role: ScreenRole; purpose: string; primary: boolean }

function selectScreens(appType: string, feat: Map<string, number>): SelectedScreen[] {
  const picked = new Map<ScreenRole, SelectedScreen>();
  const add = (role: ScreenRole, purpose: string, primary = false) => {
    if (!picked.has(role)) picked.set(role, { role, purpose, primary });
  };

  const auth = has(feat, "authentication", AUTH_THRESHOLD);

  // authentication screens ONLY when authentication is genuinely present
  if (auth) {
    add("login", "Authenticate returning users.");
    add("signup", "Register new users.");
  }

  // primary landing
  if (DASHBOARD_DOMAINS.has(appType)) add("dashboard", "Stats/overview the user lands on.", true);
  else add("home", "Main hub the user lands on.", true);

  if (has(feat, "search")) add("search", "Find items across the app.", true);

  const hasList = has(feat, "listing") || has(feat, "content") || has(feat, "booking");
  if (hasList) add("list", "Browse the app's core items.", true);

  if (hasList || has(feat, "details")) add("details", "View a single item in detail.");

  if (has(feat, "messaging")) add("detailSecondary", "Conversation / messaging.");

  if (has(feat, "cart")) add("cart", "Review selected items before ordering.");

  // A "transaction" step exists when the requirement implies checkout, payment,
  // a cart, or a booking — the CTA/copy differ by domain (see ctaFor) but they
  // all resolve to a checkout screen + a confirmation.
  const hasTransaction =
    has(feat, "checkout") || has(feat, "payments") || has(feat, "cart") || has(feat, "booking");
  if (hasTransaction) {
    const purpose =
      appType === "banking" ? "Complete the transfer."
      : has(feat, "booking") ? "Confirm the booking details."
      : "Complete the purchase.";
    add("checkout", purpose);
    add("confirmation", "Confirm a successful transaction.");
  }

  // Order tracking is a real screen ONLY for delivery domains that also have a
  // transaction to track — a food/ecommerce "track my order" flow. For other
  // domains a "track" keyword means progress/history, which the dashboard
  // already covers, so we deliberately do NOT add a tracking screen there
  // (respecting "don't blindly create a screen per keyword").
  const deliveryDomain = appType === "food-delivery" || appType === "ecommerce";
  if (has(feat, "tracking") && deliveryDomain && hasTransaction) {
    add("tracking", "Track the order's delivery status after checkout.");
  }

  // profile only when justified (auth / explicit profile feature / account-centric domains)
  if (auth || has(feat, "profile") || appType === "social" || appType === "media") {
    add("profile", "User's profile and account.", true);
  }

  return [...picked.values()].sort(
    (a, b) => SCREEN_ORDER.indexOf(a.role) - SCREEN_ORDER.indexOf(b.role),
  );
}

// ---------------------------------------------------------------------------
// 3. Assemble the Design Specification
// ---------------------------------------------------------------------------
function secondaryActionsFor(role: ScreenRole): string[] {
  switch (role) {
    case "home": case "dashboard": return ["Open item", "Search"];
    case "list": return ["Filter", "Open item"];
    case "details": return ["Back", "Save"];
    case "cart": return ["Remove item", "Edit quantity"];
    case "checkout": return ["Change address", "Change payment"];
    case "profile": return ["Edit profile", "Log out"];
    default: return [];
  }
}

/** The checkout-step CTA that matches the domain's transaction verb. */
const CHECKOUT_CTA: Record<string, string> = {
  banking: "Send",
  travel: "Confirm booking",
  healthcare: "Confirm appointment",
  booking: "Confirm reservation",
  ecommerce: "Place order",
  "food-delivery": "Place order",
};

function ctaFor(appType: string, role: ScreenRole): string | undefined {
  const domainCta = PRIMARY_CTA[appType] ?? "Continue";
  switch (role) {
    case "login": return "Sign in";
    case "signup": return "Create account";
    case "details": return appType === "banking" ? "Continue" : domainCta;
    case "cart": return "Checkout";
    case "checkout": return CHECKOUT_CTA[appType] ?? "Place order";
    case "confirmation": return "Back to home";
    case "home": case "dashboard": case "list": return domainCta;
    default: return undefined;
  }
}

function deriveInteractions(feat: Map<string, number>, screens: SelectedScreen[]): string[] {
  const roles = new Set(screens.map((s) => s.role));
  const out: string[] = ["screen navigation", "button feedback"];
  if (roles.has("login") || roles.has("signup") || roles.has("checkout")) out.push("form input & validation");
  if (roles.has("search")) out.push("search");
  if (has(feat, "listing") || has(feat, "content")) out.push("list scrolling & item selection");
  if (roles.size >= 2 && (roles.has("home") || roles.has("dashboard"))) out.push("bottom-tab switching");
  if (has(feat, "tracking") || has(feat, "dashboard")) out.push("progress / status feedback");
  if (roles.has("checkout") || roles.has("confirmation")) out.push("confirmation & success feedback");
  return out;
}

/** Options to override the derived screen set (used by AI refinement). */
export interface DesignOptions {
  /** explicit ordered role set — replaces the requirement-driven selection */
  roles?: ScreenRole[];
  /**
   * Phase 2 — an LLM-proposed screen structure. Advisory only: it is validated
   * against the known role vocabulary and a landing is guaranteed here, then the
   * generator's navigation repair guarantees integrity. When absent (LLM
   * disabled/unavailable) the deterministic `selectScreens` runs unchanged, so
   * generation never depends on the LLM at runtime.
   */
  structure?: StructurePlan;
}

/** The screen structure the LLM tier proposes (roles constrained to ScreenRole). */
export interface StructurePlan {
  /** ordered chosen roles */
  roles: ScreenRole[];
  /** subset of roles that belong to the primary (bottom) navigation */
  primary?: ScreenRole[];
}

/** The complete screen-role vocabulary the engine supports (single source: the
 *  DEFAULT_NAMES map). Sent to the backend so the LLM can only pick from these,
 *  and used to validate whatever it returns. */
export const KNOWN_ROLES: ScreenRole[] = Object.keys(DEFAULT_NAMES) as ScreenRole[];

const _PRIMARY_ROLE_DEFAULTS = new Set<ScreenRole>(["home", "dashboard", "search", "profile"]);

/**
 * The deterministic requirement-driven role selection, exposed so callers can
 * send it to the LLM as a baseline (and so it stays the single source of truth
 * for the offline path). Same result the default `deriveDesignSpec` path uses.
 */
export function deterministicRoles(analysis: RequirementAnalysis): ScreenRole[] {
  return selectScreens(analysis.appType, featureMap(analysis)).map((s) => s.role);
}

/**
 * Turn an LLM-proposed structure into the internal SelectedScreen[], keeping the
 * deterministic engine authoritative:
 *   - drop any role outside the known vocabulary (defence in depth — the backend
 *     already filters, but never trust the wire);
 *   - guarantee exactly one landing (home/dashboard) so the app always has an
 *     entry + bottom-nav anchor;
 *   - order by the canonical SCREEN_ORDER;
 *   - mark primaries from the plan, else fall back to the default primary set.
 * If nothing valid survives, the caller falls back to `selectScreens`.
 */
function applyStructure(appType: string, plan: StructurePlan): SelectedScreen[] {
  const known = new Set<ScreenRole>(KNOWN_ROLES);
  const roles: ScreenRole[] = [];
  for (const r of plan.roles) if (known.has(r) && !roles.includes(r)) roles.push(r);
  if (roles.length === 0) return [];

  // guarantee a landing the user starts on
  if (!roles.includes("home") && !roles.includes("dashboard")) {
    roles.unshift(DASHBOARD_DOMAINS.has(appType) ? "dashboard" : "home");
  }

  const primaryFromPlan = new Set<ScreenRole>(
    (plan.primary ?? []).filter((r) => known.has(r) && roles.includes(r)),
  );
  const primary = primaryFromPlan.size > 0 ? primaryFromPlan : null;

  return roles
    .slice()
    .sort((a, b) => SCREEN_ORDER.indexOf(a) - SCREEN_ORDER.indexOf(b))
    .map((role) => ({
      role,
      purpose: DEFAULT_NAMES[role] ?? "Screen",
      primary: primary ? primary.has(role) : _PRIMARY_ROLE_DEFAULTS.has(role),
    }));
}

/**
 * The ordered roles a structure plan yields AFTER validation — i.e. exactly what
 * `applyStructure` keeps (known-vocabulary filter + dedupe + guaranteed landing +
 * canonical ordering). Exposed read-only so a diagnostic can compare the raw
 * LLM proposal against the validated survivors WITHOUT re-implementing (or
 * changing) the validation logic. Returns [] when nothing valid survives (the
 * signal that the caller fell back to the deterministic selection).
 */
export function validateStructureRoles(appType: string, plan: StructurePlan): ScreenRole[] {
  return applyStructure(appType, plan).map((s) => s.role);
}

function orderRoles(roles: ScreenRole[]): SelectedScreen[] {
  const primaryRoles = new Set<ScreenRole>(["home", "dashboard", "search", "profile"]);
  const unique: ScreenRole[] = [];
  for (const r of roles) if (!unique.includes(r)) unique.push(r);
  return unique
    .sort((a, b) => SCREEN_ORDER.indexOf(a) - SCREEN_ORDER.indexOf(b))
    .map((role) => ({ role, purpose: DEFAULT_NAMES[role] ?? "Screen", primary: primaryRoles.has(role) }));
}

export function deriveDesignSpec(
  analysis: RequirementAnalysis,
  input: CreateProjectInput,
  opts: DesignOptions = {},
): DesignSpecification {
  const appType = analysis.appType;
  const feat = featureMap(analysis);

  const style = pickStyle(appType, input.designStyle);
  const tokens: DesignTokens = THEME_PRESETS[style.presetKey] ?? DEFAULT_TOKENS;

  // Screen selection precedence:
  //   1. opts.roles     — an explicit set from AI refinement (existing behaviour)
  //   2. opts.structure — an LLM-proposed structure (Phase 2), validated here;
  //                       if nothing valid survives we fall through to (3)
  //   3. selectScreens  — the deterministic, requirement-driven selection
  //                       (the offline source of truth)
  let selected: SelectedScreen[];
  if (opts.roles) {
    selected = orderRoles(opts.roles);
  } else if (opts.structure) {
    const structured = applyStructure(appType, opts.structure);
    selected = structured.length > 0 ? structured : selectScreens(appType, feat);
  } else {
    selected = selectScreens(appType, feat);
  }

  const screens: DesignScreen[] = selected.map((s) => ({
    role: s.role,
    name: nameFor(appType, s.role),
    purpose: s.purpose,
    layout: LAYOUT_FOR[s.role],
    components: COMPONENTS_FOR[s.role] ?? COMPONENTS_FOR.generic,
    primaryCta: ctaFor(appType, s.role),
    secondaryActions: secondaryActionsFor(s.role),
    states: statesFor(s.role),
    navTargets: [], // filled by the compiler once ids/links are known
    isPrimaryDestination: s.primary,
  }));

  const primaryDestinations = selected.filter((s) => s.primary).map((s) => s.role);
  const pattern: NavPattern = primaryDestinations.length >= 2 ? "bottom-tab" : "stack";

  const capabilities = analysis.features
    .filter((f) => f.confidence >= PRESENT_THRESHOLD)
    .map((f) => f.name);

  return {
    style: style.style,
    visualTone: style.tone,
    rationale: `${style.rationale}. Screens and navigation were derived from the detected capabilities (${capabilities.join(", ") || "core only"}).`,
    tokens,
    // density follows the chosen token set (single source of truth) so the
    // DesignSpec and the renderer never disagree about spacing rhythm
    density: tokens.density,
    navigation: {
      pattern,
      primaryDestinations,
      primaryCta: PRIMARY_CTA[appType] ?? "Continue",
    },
    screens,
    interactions: deriveInteractions(feat, selected),
    capabilities,
  };
}
