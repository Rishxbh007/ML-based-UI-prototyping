/**
 * AI Refinement — client side.
 *
 * Two pieces:
 *  1) parseRefinementLocally: offline mirror of the backend rule parser
 *     (used when the backend/LLM isn't available), turning free text into a
 *     structured RefinementCommand.
 *  2) applyRefinement: the DETERMINISTIC engine step that applies a command to
 *     a prototype. Structural edits (add/remove screen, rename) regenerate the
 *     prototype from its stored analysis so navigation stays consistent;
 *     theme edits swap the token set. This is the honest split: parsing may be
 *     ML/LLM, application is always deterministic.
 */
import type { Prototype, ScreenRole, CreateProjectInput } from "@/types/schema";
import { THEME_PRESETS } from "@/data/themePresets";
import { generate } from "@/lib/generator";

export interface RefinementCommand {
  op:
    | "set_theme"
    | "toggle_dark"
    | "add_screen"
    | "remove_screen"
    | "rename_app"
    | "simplify_screen"
    | "unknown";
  theme_preset?: string;
  screen_role?: string;
  app_name?: string;
  note: string;
  source: "llm" | "rule";
}

const KNOWN_ROLES: ScreenRole[] = [
  "splash", "login", "signup", "home", "dashboard", "search", "list",
  "details", "cart", "checkout", "confirmation", "tracking", "profile", "settings",
];

const THEME_WORDS: Record<string, string[]> = {
  "premium-dark": ["dark", "premium", "sleek", "night", "black", "luxur"],
  "minimal-fresh": ["minimal", "clean", "simple", "light", "white"],
  "energetic-fitness": ["energetic", "bold", "vibrant", "sporty"],
  "trust-finance": ["corporate", "trust", "professional", "finance"],
  "warm-commerce": ["warm", "friendly", "shopping"],
  "calm-education": ["calm", "soft", "learning"],
};

function matchRole(word: string): ScreenRole | null {
  const aliases: Record<string, ScreenRole> = {
    signin: "login", sign: "login", register: "signup", account: "profile",
    payment: "checkout", pay: "checkout", browse: "list", products: "list",
  };
  const w = (aliases[word] ?? word) as ScreenRole;
  return KNOWN_ROLES.includes(w) ? w : null;
}

export function parseRefinementLocally(instruction: string): RefinementCommand {
  const text = instruction.toLowerCase().trim();

  // Any request mentioning "dark" is a dark-mode toggle ("make it dark",
  // "dark theme", "dark mode"). This must run BEFORE the theme-word loop below,
  // otherwise "premium-dark" would greedily claim it as a set_theme.
  if (text.includes("dark")) {
    return { op: "toggle_dark", note: "Switch the prototype to a dark theme.", source: "rule" };
  }

  for (const [preset, words] of Object.entries(THEME_WORDS)) {
    if (words.some((w) => text.includes(w)) &&
        (text.includes("theme") || text.includes("style") || text.includes("look") || text.includes("make it"))) {
      return { op: "set_theme", theme_preset: preset, note: `Apply the '${preset}' theme.`, source: "rule" };
    }
  }

  let m = text.match(/\badd (?:a |an )?(\w+)(?: screen| page)?/);
  if (m && (text.includes("screen") || text.includes("page") || matchRole(m[1]))) {
    const role = matchRole(m[1]);
    if (role) return { op: "add_screen", screen_role: role, note: `Add a ${role} screen.`, source: "rule" };
  }

  m = text.match(/\b(?:remove|delete) (?:the )?(\w+)(?: screen| page)?/);
  if (m) {
    const role = matchRole(m[1]);
    if (role) return { op: "remove_screen", screen_role: role, note: `Remove the ${role} screen.`, source: "rule" };
  }

  m = text.match(/(?:rename|call) (?:the app |it )?(?:to |as )?["']?([a-z0-9 ]{2,30})["']?$/);
  if (m) {
    const name = m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    return { op: "rename_app", app_name: name, note: `Rename the app to '${name}'.`, source: "rule" };
  }

  if (text.includes("simpl") || text.includes("cleaner") || text.includes("less")) {
    const role = KNOWN_ROLES.find((r) => text.includes(r)) ?? "home";
    return { op: "simplify_screen", screen_role: role, note: `Simplify the ${role} screen.`, source: "rule" };
  }

  if (text.includes("premium") || text.includes("luxur")) {
    return { op: "set_theme", theme_preset: "premium-dark", note: "Apply a premium dark theme.", source: "rule" };
  }

  return {
    op: "unknown",
    note: "I couldn't map that to a supported edit. Try: 'add a settings screen', 'make it dark', 'apply a minimal theme', or 'rename to Feast'.",
    source: "rule",
  };
}

/** The prototype's current screen role set (Design Spec is source of truth). */
function currentRoles(p: Prototype): ScreenRole[] {
  if (p.design?.screens?.length) return p.design.screens.map((s) => s.role);
  return p.screens.map((s) => s.role);
}

function inputFromPrototype(p: Prototype): CreateProjectInput {
  return {
    name: p.appName,
    description: p.analysis?.purpose ?? "",
    targetPlatform: p.targetPlatform,
    designStyle: p.designStyle,
  };
}

export interface RefineResult {
  prototype: Prototype;
  ok: boolean;
  message: string;
}

export function applyRefinement(prototype: Prototype, cmd: RefinementCommand): RefineResult {
  const analysis = prototype.analysis;

  switch (cmd.op) {
    case "toggle_dark":
    case "set_theme": {
      const presetId = cmd.op === "toggle_dark" ? "premium-dark" : cmd.theme_preset ?? "premium-dark";
      const tokens = THEME_PRESETS[presetId];
      if (!tokens) return { prototype, ok: false, message: `Unknown theme '${presetId}'.` };
      return {
        prototype: { ...prototype, tokens, designStyle: presetId },
        ok: true,
        message: cmd.note,
      };
    }

    case "rename_app": {
      if (!analysis || !cmd.app_name) {
        // shallow rename if we can't regenerate
        return { prototype: { ...prototype, appName: cmd.app_name ?? prototype.appName }, ok: true, message: cmd.note };
      }
      const input = { ...inputFromPrototype(prototype), name: cmd.app_name };
      // preserve the current screen set (Design Intelligence is the source of
      // truth for screens; we only change the name here)
      const roles = currentRoles(prototype);
      const regenerated = generate(analysis, input, { roles });
      return { prototype: { ...regenerated, tokens: prototype.tokens }, ok: true, message: cmd.note };
    }

    case "add_screen":
    case "remove_screen": {
      if (!analysis) return { prototype, ok: false, message: "Can't restructure a prototype without its analysis." };
      const role = cmd.screen_role as ScreenRole | undefined;
      if (!role) return { prototype, ok: false, message: "No screen role provided." };

      let roles = currentRoles(prototype);
      if (cmd.op === "add_screen") {
        if (roles.includes(role)) {
          return { prototype, ok: false, message: `There's already a ${role} screen.` };
        }
        roles = [...roles, role];
      } else {
        if (["home", "dashboard", "login"].includes(role)) {
          return { prototype, ok: false, message: `The ${role} screen is core and can't be removed.` };
        }
        roles = roles.filter((r) => r !== role);
      }
      const regenerated = generate(analysis, inputFromPrototype(prototype), { roles });
      return { prototype: { ...regenerated, tokens: prototype.tokens }, ok: true, message: cmd.note };
    }

    case "simplify_screen": {
      const role = cmd.screen_role;
      const screens = prototype.screens.map((s) => {
        if (s.role !== role) return s;
        // keep the appbar/heading and the primary interactive elements only
        const kept = s.components.filter(
          (c, i) => i < 2 || ["button", "list", "bottomNav", "searchBar", "input"].includes(c.type),
        );
        return { ...s, components: kept };
      });
      return { prototype: { ...prototype, screens }, ok: true, message: cmd.note };
    }

    default:
      return { prototype, ok: false, message: cmd.note };
  }
}
