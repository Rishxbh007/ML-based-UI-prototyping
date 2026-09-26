/**
 * Design-token presets for GENERATED prototypes.
 *
 * These are NOT dozens of separate hardcoded designs — they are a small set of
 * reusable token sets. The generation engine chooses one based on the detected
 * app type + the user's requested design style, then every screen/component
 * renders from these tokens. Changing a token restyles the whole prototype.
 *
 * Two things make generated apps look distinct rather than identical:
 *   1. Verified per-domain palettes (sourced from the ui-ux-pro-max design
 *      database: banking navy+gold, healthcare calm cyan+green, travel sky+
 *      adventure-orange, fitness energetic-orange on OLED, etc.).
 *   2. Feel tokens — shadow / density / cardStyle / radius — so a finance app
 *      reads compact & outlined while a fitness app reads bold & elevated.
 *
 * Typography is a phone-appropriate modular scale (skill rule "Font Size Scale":
 * 12/14/16/20/... ). Body stays 13-14, headings 20-22, display 28-32 — sized
 * for a 320px frame, never the desktop 24-30 we had before.
 */
import type { DesignTokens } from "@/types/schema";

/** Shared phone type scales. Kept as small helpers so every preset stays on a
 *  coherent modular scale instead of hand-picked numbers per theme. */
const SCALE_STANDARD = {
  display: 30, heading: 21, subheading: 16, body: 14, caption: 12,
  headingWeight: 700, bodyWeight: 400,
} as const;
const SCALE_COMPACT = {
  display: 28, heading: 20, subheading: 15, body: 13, caption: 11,
  headingWeight: 700, bodyWeight: 400,
} as const;
const SCALE_BOLD = {
  display: 32, heading: 22, subheading: 16, body: 14, caption: 12,
  headingWeight: 800, bodyWeight: 500,
} as const;

export const THEME_PRESETS: Record<string, DesignTokens> = {
  // Neutral, content-first light theme — the default / minimal direction.
  "minimal-fresh": {
    preset: "minimal-fresh",
    colors: {
      primary: "#111827",
      primaryText: "#FFFFFF",
      secondary: "#6B7280",
      background: "#FFFFFF",
      surface: "#F7F8FA",
      surfaceAlt: "#EEF0F3",
      text: "#0B0C0F",
      textMuted: "#6B7280",
      border: "#E6E8EC",
      accent: "#4F46E5",
      success: "#0EA36B",
      danger: "#E5484D",
    },
    typography: { fontFamily: "Inter, system-ui, sans-serif", ...SCALE_STANDARD },
    radius: 14,
    spacingUnit: 8,
    shadow: "soft",
    density: "comfortable",
    cardStyle: "outlined",
  },

  // Immersive dark surface — social / media / explicit "dark|premium" requests.
  "premium-dark": {
    preset: "premium-dark",
    colors: {
      primary: "#8A5CFF",
      primaryText: "#0B0713",
      secondary: "#A0A3B1",
      background: "#0B0C10",
      surface: "#15161D",
      surfaceAlt: "#1E202A",
      text: "#F5F6F8",
      textMuted: "#9A9DAA",
      border: "rgba(255,255,255,0.09)",
      accent: "#38E1D6",
      success: "#2FD98A",
      danger: "#FF5D6C",
    },
    typography: { fontFamily: "Sora, Inter, sans-serif", ...SCALE_STANDARD },
    radius: 18,
    spacingUnit: 8,
    shadow: "strong",
    density: "comfortable",
    cardStyle: "filled",
  },

  // Energetic OLED — fitness. Verified: energetic orange + electric-blue accent
  // on a near-black surface, bold condensed-feeling weights.
  "energetic-fitness": {
    preset: "energetic-fitness",
    colors: {
      primary: "#FF5A1F",
      primaryText: "#FFFFFF",
      secondary: "#12131A",
      background: "#0E0F13",
      surface: "#17181F",
      surfaceAlt: "#20222B",
      text: "#FFFFFF",
      textMuted: "#9CA0AD",
      border: "rgba(255,255,255,0.08)",
      accent: "#3B82F6",
      success: "#37E28B",
      danger: "#FF4757",
    },
    typography: { fontFamily: "Sora, Inter, sans-serif", ...SCALE_BOLD },
    radius: 20,
    spacingUnit: 8,
    shadow: "strong",
    density: "comfortable",
    cardStyle: "elevated",
  },

  // Trust finance — banking. Verified: navy #0F172A + trust blue + premium gold
  // accent, light slate background, compact & outlined for number legibility.
  "trust-finance": {
    preset: "trust-finance",
    colors: {
      primary: "#0F172A",
      primaryText: "#FFFFFF",
      secondary: "#1E3A8A",
      background: "#F8FAFC",
      surface: "#FFFFFF",
      surfaceAlt: "#E8ECF1",
      text: "#020617",
      textMuted: "#475569",
      border: "#E2E8F0",
      accent: "#A16207",
      success: "#0FA968",
      danger: "#DC2626",
    },
    typography: { fontFamily: "'IBM Plex Sans', Inter, system-ui, sans-serif", ...SCALE_COMPACT },
    radius: 12,
    spacingUnit: 8,
    shadow: "soft",
    density: "compact",
    cardStyle: "outlined",
  },

  // Warm commerce — food delivery & e-commerce. Appetising orange-red + amber.
  "warm-commerce": {
    preset: "warm-commerce",
    colors: {
      primary: "#E8562A",
      primaryText: "#FFFFFF",
      secondary: "#2A1D18",
      background: "#FFFBF8",
      surface: "#FFFFFF",
      surfaceAlt: "#FBEEE7",
      text: "#231712",
      textMuted: "#8A7268",
      border: "#F0E2D9",
      accent: "#F5A623",
      success: "#12A150",
      danger: "#E5484D",
    },
    typography: { fontFamily: "Inter, system-ui, sans-serif", ...SCALE_STANDARD },
    radius: 16,
    spacingUnit: 8,
    shadow: "medium",
    density: "comfortable",
    cardStyle: "elevated",
  },

  // Calm education — readable, distraction-free blue + violet accent.
  "calm-education": {
    preset: "calm-education",
    colors: {
      primary: "#2F6BFF",
      primaryText: "#FFFFFF",
      secondary: "#1B2A4A",
      background: "#FBFCFE",
      surface: "#FFFFFF",
      surfaceAlt: "#EEF3FB",
      text: "#12203B",
      textMuted: "#63708C",
      border: "#E3EAF5",
      accent: "#7A5CFF",
      success: "#12A150",
      danger: "#E5484D",
    },
    typography: { fontFamily: "Inter, system-ui, sans-serif", ...SCALE_STANDARD },
    radius: 16,
    spacingUnit: 8,
    shadow: "soft",
    density: "comfortable",
    cardStyle: "outlined",
  },

  // Calm healthcare — verified: calm cyan #0891B2 + health green #059669 on a
  // very light cyan wash; soft/neumorphic feel, comfortable spacing, gentle.
  "calm-health": {
    preset: "calm-health",
    colors: {
      primary: "#0891B2",
      primaryText: "#FFFFFF",
      secondary: "#164E63",
      background: "#ECFEFF",
      surface: "#FFFFFF",
      surfaceAlt: "#E1F4F8",
      text: "#0B3947",
      textMuted: "#4A6B75",
      border: "#BDE7EF",
      accent: "#059669",
      success: "#059669",
      danger: "#DC2626",
    },
    typography: { fontFamily: "Inter, system-ui, sans-serif", ...SCALE_STANDARD },
    radius: 18,
    spacingUnit: 8,
    shadow: "soft",
    density: "comfortable",
    cardStyle: "elevated",
  },

  // Editorial travel — verified: sky blue #0EA5E9 + adventure orange #EA580C,
  // imagery-led editorial feel with a serif-friendly heading stack.
  "editorial-travel": {
    preset: "editorial-travel",
    colors: {
      primary: "#0EA5E9",
      primaryText: "#FFFFFF",
      secondary: "#0C4A6E",
      background: "#F0F9FF",
      surface: "#FFFFFF",
      surfaceAlt: "#E2F1FA",
      text: "#0C3A54",
      textMuted: "#4C6B7E",
      border: "#C6E6F5",
      accent: "#EA580C",
      success: "#12A150",
      danger: "#DC2626",
    },
    typography: {
      fontFamily: "'Playfair Display', Georgia, serif",
      // editorial: display/heading lean large & expressive, body stays clean sans
      display: 32, heading: 22, subheading: 16, body: 14, caption: 12,
      headingWeight: 700, bodyWeight: 400,
    },
    radius: 16,
    spacingUnit: 8,
    shadow: "medium",
    density: "comfortable",
    cardStyle: "elevated",
  },

  // Vibrant media — verified: rose #E11D48 + engagement blue #2563EB. Immersive
  // dark so media/thumbnails pop; strong elevation.
  "vibrant-media": {
    preset: "vibrant-media",
    colors: {
      primary: "#E11D48",
      primaryText: "#FFFFFF",
      secondary: "#FB7185",
      background: "#0C0A0F",
      surface: "#17141B",
      surfaceAlt: "#221D28",
      text: "#F7F5F8",
      textMuted: "#A79FB0",
      border: "rgba(255,255,255,0.08)",
      accent: "#2563EB",
      success: "#2FD98A",
      danger: "#FF5D6C",
    },
    typography: { fontFamily: "Sora, Inter, sans-serif", ...SCALE_STANDARD },
    radius: 16,
    spacingUnit: 8,
    shadow: "strong",
    density: "comfortable",
    cardStyle: "filled",
  },

  // Flat booking — verified: clean blue + success green + category accents,
  // flat with micro-interaction feel, comfortable calendar-friendly spacing.
  "flat-booking": {
    preset: "flat-booking",
    colors: {
      primary: "#2563EB",
      primaryText: "#FFFFFF",
      secondary: "#1E293B",
      background: "#F7F9FC",
      surface: "#FFFFFF",
      surfaceAlt: "#EDF2FA",
      text: "#0F1B33",
      textMuted: "#5A6B85",
      border: "#DEE6F2",
      accent: "#0FA968",
      success: "#0FA968",
      danger: "#DC2626",
    },
    typography: { fontFamily: "Inter, system-ui, sans-serif", ...SCALE_STANDARD },
    radius: 14,
    spacingUnit: 8,
    shadow: "soft",
    density: "comfortable",
    cardStyle: "outlined",
  },
};

/**
 * Map a requested design "style" word + detected app type to a preset id.
 * Keeps the engine deterministic: same inputs -> same theme.
 */
export function resolveThemePreset(appType: string, style: string): string {
  const s = (style || "").toLowerCase();
  if (s.includes("dark") || s.includes("premium")) return "premium-dark";
  if (s.includes("minimal") || s.includes("clean")) return "minimal-fresh";

  switch (appType) {
    case "fitness":
      return "energetic-fitness";
    case "banking":
    case "finance":
      return "trust-finance";
    case "food-delivery":
    case "ecommerce":
      return "warm-commerce";
    case "education":
      return "calm-education";
    case "healthcare":
      return "calm-health";
    case "travel":
      return "editorial-travel";
    case "media":
      return "vibrant-media";
    case "booking":
      return "flat-booking";
    case "social":
      return "premium-dark";
    default:
      return "minimal-fresh";
  }
}

export const DEFAULT_TOKENS = THEME_PRESETS["minimal-fresh"];
