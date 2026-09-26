/**
 * Morph prototype schema — the single source of truth for what a generated
 * prototype IS. Both the ML/generation backend (Pydantic mirror in
 * backend/app/schemas) and the React renderer speak this shape.
 *
 * A Prototype is pure structured data:
 *   Prototype -> Screens -> Components (+ style, props, action)
 *              -> NavigationGraph (edges between screens)
 *              -> DesignTokens (theme applied at render time)
 *
 * The renderer is generic: it never hardcodes a "Login screen" — it renders
 * whatever components the schema describes. This is what makes generation
 * dynamic rather than a set of canned pages.
 */

// ---------------------------------------------------------------------------
// Design tokens — the theme a prototype is rendered with. The generation
// engine picks a token set based on the detected app type + requested style.
// ---------------------------------------------------------------------------
export interface DesignTokens {
  /** id of the style preset used, e.g. "minimal-fresh", "premium-dark" */
  preset: string;
  colors: {
    primary: string;
    primaryText: string; // text/icon color that sits on `primary`
    secondary: string;
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
    border: string;
    accent: string;
    success: string;
    danger: string;
  };
  typography: {
    fontFamily: string;
    /** px sizes — phone-appropriate scale (display >= heading >= subheading >= body >= caption) */
    display: number; // hero/banner numerals & splash (largest)
    heading: number;
    subheading: number;
    body: number;
    caption: number;
    headingWeight: number;
    bodyWeight: number;
  };
  radius: number; // base corner radius in px
  spacingUnit: number; // base spacing unit in px (scale = unit * {1,2,3,4,6})
  /** elevation style applied to cards/surfaces — varies the "feel" per domain */
  shadow: "none" | "soft" | "medium" | "strong";
  /** vertical rhythm; compact packs more info (dashboards/finance), comfortable breathes */
  density: "compact" | "comfortable";
  /** how cards read: flat outline, subtly elevated, or filled surface */
  cardStyle: "outlined" | "elevated" | "filled";
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
export type ComponentType =
  | "appbar"
  | "text"
  | "heading"
  | "button"
  | "input"
  | "image"
  | "card"
  | "listItem"
  | "list"
  | "searchBar"
  | "tabBar" // top segmented tabs
  | "bottomNav" // bottom navigation bar
  | "avatar"
  | "icon"
  | "toggle"
  | "chip"
  | "chipRow" // horizontal row of category/filter chips
  | "balanceCard" // hero balance/metric card (finance/dashboard)
  | "stat"
  | "divider"
  | "spacer"
  | "banner"
  | "ratingStars"
  | "priceTag"
  | "progress";

/** A navigation or behavioral action attached to a component. */
export interface ComponentAction {
  type: "navigate" | "back" | "restart" | "toggle" | "submit" | "none";
  /** target screen id for "navigate" */
  target?: string;
  /** free-form label used by the flow graph, e.g. "Place order" */
  label?: string;
}

/** Per-component style overrides (all optional; fall back to design tokens). */
export interface ComponentStyle {
  bg?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  radius?: number;
  paddingX?: number;
  paddingY?: number;
  align?: "left" | "center" | "right";
  fullWidth?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "outline"; // for buttons/chips
  height?: number;
  /** typographic scale a heading inherits when no explicit fontSize is set:
   *  "display" = hero/landmark headings, "heading" = standard section titles */
  scale?: "display" | "heading";
}

/** Arbitrary per-type properties (kept loose but documented per component). */
export interface ComponentProps {
  placeholder?: string;
  icon?: string; // lucide icon name
  items?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    trailing?: string;
    icon?: string;
    price?: string;
    rating?: number;
    image?: string; // color/gradient token for the thumbnail
  }>;
  tabs?: string[];
  activeTab?: number;
  value?: string;
  checked?: boolean;
  label?: string;
  statLabel?: string;
  statValue?: string;
  progress?: number; // 0..100
  columns?: number; // grid layout for lists
  imageTone?: string; // background tone for image blocks
  rows?: number;
  rating?: number; // 0..5, for the ratingStars component
  /** per-tab navigation targets for bottomNav (screen ids, parallel to `tabs`) */
  targets?: Array<string | undefined>;
  /** chip labels for a horizontal chip row (categories/filters) */
  chips?: string[];
  /** index of the active chip in `chips` */
  activeChip?: number;
}

export interface Component {
  id: string;
  type: ComponentType;
  /** primary text content where applicable */
  content?: string;
  style?: ComponentStyle;
  props?: ComponentProps;
  action?: ComponentAction;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
export type ScreenRole =
  | "splash"
  | "onboarding"
  | "login"
  | "signup"
  | "home"
  | "dashboard"
  | "search"
  | "list"
  | "details"
  | "cart"
  | "checkout"
  | "confirmation"
  | "tracking"
  | "profile"
  | "settings"
  | "detailSecondary"
  | "generic";

export interface Screen {
  id: string;
  name: string;
  role: ScreenRole;
  /** whether this screen shows the app's bottom navigation */
  showsBottomNav: boolean;
  components: Component[];
}

// ---------------------------------------------------------------------------
// Navigation graph
// ---------------------------------------------------------------------------
export interface NavEdge {
  id: string;
  from: string; // screen id
  to: string; // screen id
  /** what triggers this edge, for the flow-graph labels */
  trigger: string;
}

export interface NavigationGraph {
  entry: string; // starting screen id
  edges: NavEdge[];
}

// ---------------------------------------------------------------------------
// The analysis result produced by the ML pipeline (also surfaced in the UI
// so the ML contribution is visible / explainable in the viva).
// ---------------------------------------------------------------------------
export interface RequirementAnalysis {
  appType: string; // predicted class label
  appTypeConfidence: number; // 0..1
  /** top-k class probabilities for the ML insight panel */
  appTypeProbabilities: Array<{ label: string; score: number }>;
  targetUsers: string;
  purpose: string;
  features: Array<{ name: string; confidence: number; source: "ml" | "rule" }>;
  actions: string[];
  entities: Array<{ text: string; kind: string }>;
  inferredScreens: Array<{ role: ScreenRole; reason: string }>;
  /** which pipeline stages actually ran (spaCy? embeddings? fallback?) */
  pipeline: {
    preprocessing: string;
    classifier: string;
    extraction: string;
  };
  /**
   * Confidence / uncertainty decision (additive, optional so hand-built demos
   * and older payloads still type-check). When the classifier had too little
   * evidence to recognize the input, or no domain is clearly ahead, the app
   * asks the user to clarify instead of generating a likely-wrong prototype.
   * The raw `appTypeProbabilities` above are never modified by this layer.
   */
  needsClarification?: boolean;
  clarification?: string | null;
  classification?: {
    decision: "ok" | "low_confidence" | "insufficient_evidence" | "out_of_scope";
    confident: boolean;
    topProbability: number;
    margin: number;
    evidence: { recognized: number; analyzed: number; coverage: number };
  };
}

// ---------------------------------------------------------------------------
// The full prototype
// ---------------------------------------------------------------------------
export interface Prototype {
  schemaVersion: number;
  appName: string;
  appType: string;
  designStyle: string;
  targetPlatform: "ios" | "android";
  tokens: DesignTokens;
  screens: Screen[];
  navigation: NavigationGraph;
  /** the analysis that produced this prototype (optional on hand-built demos) */
  analysis?: RequirementAnalysis;
  /** the Design Specification the prototype was compiled from (Phase: Design Intelligence) */
  design?: import("./design").DesignSpecification;
}

// ---------------------------------------------------------------------------
// Project = a saved prototype + metadata (persistence layer)
// ---------------------------------------------------------------------------
export interface Project {
  id: string;
  name: string;
  description: string;
  targetPlatform: "ios" | "android";
  designStyle: string;
  targetAudience?: string;
  createdAt: string;
  updatedAt: string;
  prototype: Prototype;
}

/** Input captured by the "Create Prototype" flow. */
export interface CreateProjectInput {
  name: string;
  description: string;
  targetPlatform: "ios" | "android";
  designStyle: string;
  targetAudience?: string;
}
