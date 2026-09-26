/**
 * UI generation engine (the Renderer's front-half).
 *
 *   generate(analysis, input) -> Prototype
 *
 * Three clean layers, kept separate:
 *   1. Intelligence        (analysis)      — "what app does the user want?"
 *   2. Design Intelligence (DesignSpec)    — "how should it be structured/designed?"
 *   3. Renderer            (this compiler) — "turn the DesignSpec into UI"
 *
 * This function no longer makes design decisions. It calls `deriveDesignSpec`
 * to get a Design Specification, then COMPILES it into the concrete `Prototype`
 * schema the React renderer consumes: it lays out the chosen screens, builds
 * their components from the shared primitives, wires navigation, and applies the
 * design system tokens the DesignSpec selected. The DesignSpec is attached to
 * the prototype so the workspace can show the reasoning.
 */
import type {
  Component,
  ComponentAction,
  NavEdge,
  Prototype,
  RequirementAnalysis,
  Screen,
  ScreenRole,
  CreateProjectInput,
} from "@/types/schema";
import { contentFor, type AppContent } from "./content";
import { BUILDERS, genericScreen, type BuildContext } from "./screens";
import { deriveDesignSpec, type DesignOptions } from "./designIntelligence";
import { deriveSubject, nameIsGrounded, subjectListItems, type EntitySubject } from "./entityContent";
import { domainVocabulary } from "./localAnalysis";
import { c } from "./factory";
import { slug, uid } from "./ids";

export function generate(
  analysis: RequirementAnalysis,
  input: CreateProjectInput,
  opts: DesignOptions = {},
  contentOverride?: AppContent,
): Prototype {
  const appType = analysis.appType;
  // Hybrid content: use the LLM-authored, request-specific content when the
  // caller fetched it; otherwise the built-in per-domain library (offline tier).
  const content = contentOverride ?? contentFor(appType);

  // ---- Design Intelligence: decide the design BEFORE we build anything ----
  const design = deriveDesignSpec(analysis, input, opts);

  // ---- Entity-driven relabel (deterministic, offline, generic) -----------
  // The domain template names screens generically ("Restaurants"/"Browse").
  // When the requirement's real subject is one the domain doesn't account for
  // (e.g. a team-lunch app whose subject is coworkers, not restaurants), relabel
  // the browse/detail screens to that subject. This fires only when ALL of:
  //   (1) the classifier is confident (never relabel meaningless/abstained input),
  //   (2) there is a domain-foreign subject in the requirement's own words, and
  //   (3) the template's chosen name is NOT itself grounded in the requirement —
  //       i.e. the user never actually said "restaurant", so the stock name is a
  //       template assumption, not something the user asked for. When the name IS
  //       grounded (a shop that really says "products"), it is kept untouched.
  // This touches screen NAMES only (deterministic in both tiers), never content,
  // so it can never clobber LLM-authored copy.
  const decision = analysis.classification?.decision;
  const classOk = decision === undefined || decision === "ok";
  let appliedSubject: EntitySubject | null = null;
  if (classOk) {
    const subject = deriveSubject(analysis.entities ?? [], domainVocabulary(appType));
    if (subject) {
      const description = input.description ?? "";
      for (const ds of design.screens) {
        if (ds.role !== "list" && ds.role !== "details") continue;
        if (nameIsGrounded(ds.name, description)) continue;
        ds.name = ds.role === "list" ? subject.plural : subject.singular;
        appliedSubject = subject;
      }
    }
  }

  // 1. screen roles come from the Design Specification (requirement-driven)
  const roles: ScreenRole[] = design.screens.map((s) => s.role);
  if (roles.length === 0) roles.push("home");

  const nameByRole = new Map<ScreenRole, string>(design.screens.map((s) => [s.role, s.name]));
  const primaryDestinations = design.navigation.primaryDestinations;
  const usesBottomNav = design.navigation.pattern === "bottom-tab";

  // 2. assign ids
  const idByRole = new Map<ScreenRole, string>();
  for (const role of roles) idByRole.set(role, `scr_${slug(role)}_${uid("s").slice(-4)}`);

  const hasScreen = (role: ScreenRole) => idByRole.has(role);
  const nameFor = (role: ScreenRole) => nameByRole.get(role) ?? role;

  // capabilities the design layer surfaced (drives requirement-driven UI like
  // the reviews section on the detail screen)
  const capabilities = new Set(design.capabilities);

  // navigation edges (derived from the navigate-actions actually placed)
  const edges: NavEdge[] = [];
  const seenEdge = new Set<string>();
  const navTargetsByRole = new Map<ScreenRole, Set<ScreenRole>>();

  const recordTarget = (from: ScreenRole, to: ScreenRole) => {
    if (!navTargetsByRole.has(from)) navTargetsByRole.set(from, new Set());
    navTargetsByRole.get(from)!.add(to);
  };

  const makeCtx = (fromRole: ScreenRole): BuildContext => ({
    appName: input.name || "Your App",
    appType,
    content,
    hasScreen,
    capabilities,
    subject: appliedSubject ?? undefined,
    // Offline + actor-subject only: swap the domain's stock sample cards for
    // neutral people rows so a relabeled "Coworkers" browse screen shows people,
    // not the domain library's pizzas. Gated to the offline tier (no LLM content
    // override) because when Gemini authored the content it already matches the
    // subject; and to actor kinds so item/content subjects keep the rich domain data.
    subjectItems:
      appliedSubject && appliedSubject.kind === "actor" && !contentOverride
        ? subjectListItems(appliedSubject)
        : undefined,
    navTo: (target, label) => {
      const targetId = idByRole.get(target);
      const fromId = idByRole.get(fromRole);
      if (!targetId || !fromId) return { type: "none" };
      recordTarget(fromRole, target);
      const key = `${fromId}->${targetId}`;
      if (!seenEdge.has(key)) {
        seenEdge.add(key);
        edges.push({ id: uid("edge"), from: fromId, to: targetId, trigger: label ?? nameFor(target) });
      }
      const action: ComponentAction = { type: "navigate", target: targetId, label };
      return action;
    },
    bottomNav: () => {
      if (!usesBottomNav) return null;
      const present = primaryDestinations.filter((r) => idByRole.has(r));
      if (present.length < 2) return null;
      const labels = present.map((r) => nameFor(r));
      const comp: Component = {
        id: uid("bottomNav"),
        type: "bottomNav",
        props: { tabs: labels, activeTab: Math.max(0, present.indexOf(fromRole)) },
      };
      for (const r of present) {
        if (r !== fromRole) {
          recordTarget(fromRole, r);
          const targetId = idByRole.get(r)!;
          const fromId = idByRole.get(fromRole)!;
          const key = `${fromId}->${targetId}:nav`;
          if (!seenEdge.has(key)) {
            seenEdge.add(key);
            edges.push({ id: uid("edge"), from: fromId, to: targetId, trigger: "Tab: " + nameFor(r) });
          }
        }
      }
      comp.props!.targets = present.map((r) => idByRole.get(r));
      return comp;
    },
  });

  // 3. build each screen's components from the shared primitives
  const screens: Screen[] = roles.map((role) => {
    const ctx = makeCtx(role);
    const builder = BUILDERS[role];
    const name = nameFor(role);
    const components = builder ? builder(ctx) : genericScreen(ctx, name);
    return {
      id: idByRole.get(role)!,
      name,
      role,
      showsBottomNav: usesBottomNav && primaryDestinations.includes(role),
      components,
    };
  });

  // 4. back-fill the DesignSpec's per-screen navTargets now that links exist
  for (const ds of design.screens) {
    ds.navTargets = [...(navTargetsByRole.get(ds.role) ?? [])];
  }

  const entry = idByRole.get("splash") ?? idByRole.get("login") ?? screens[0].id;

  // ---- 5. navigation validation + repair (safety net) --------------------
  // The builders already wire correct, domain-appropriate flows. This pass
  // guarantees the brief's navigation contract holds for every generated set
  // (including sparse domains and AI-refined role sets): no screen is
  // unreachable from the entry, and no screen is a dead-end. It never points at
  // a screen that wasn't generated because it only links screens that exist.
  repairNavigation(screens, edges, seenEdge, idByRole, entry, navTargetsByRole, usesBottomNav, primaryDestinations);

  // re-sync navTargets after any repair edges were added
  for (const ds of design.screens) {
    ds.navTargets = [...(navTargetsByRole.get(ds.role) ?? [])];
  }

  return {
    schemaVersion: 1,
    appName: input.name || "Your App",
    appType,
    designStyle: design.style,
    targetPlatform: input.targetPlatform || "ios",
    tokens: design.tokens,
    screens,
    navigation: { entry, edges },
    analysis,
    design,
  };
}

/**
 * Navigation safety net. Mutates `screens`/`edges` in place so that:
 *   (a) every screen is reachable from `entry` — any orphan gets a labelled
 *       navigation card appended to a hub screen (home → dashboard → entry),
 *       with the matching edge recorded; and
 *   (b) no screen is a dead-end — a screen with no forward/back/restart action
 *       that isn't a bottom-nav root gets a "Back" button.
 * It only ever links screens that were actually generated, so it can't create
 * a link to a non-existent screen.
 */
function repairNavigation(
  screens: Screen[],
  edges: NavEdge[],
  seenEdge: Set<string>,
  idByRole: Map<ScreenRole, string>,
  entry: string,
  navTargetsByRole: Map<ScreenRole, Set<ScreenRole>>,
  usesBottomNav: boolean,
  primaryDestinations: ScreenRole[],
): void {
  const screenById = new Map(screens.map((s) => [s.id, s]));
  const roleById = new Map<string, ScreenRole>();
  for (const [role, id] of idByRole) roleById.set(id, role);

  const addEdge = (fromId: string, toId: string, trigger: string) => {
    const key = `${fromId}->${toId}`;
    if (seenEdge.has(key)) return;
    seenEdge.add(key);
    edges.push({ id: uid("edge"), from: fromId, to: toId, trigger });
    const fromRole = roleById.get(fromId);
    const toRole = roleById.get(toId);
    if (fromRole && toRole) {
      if (!navTargetsByRole.has(fromRole)) navTargetsByRole.set(fromRole, new Set());
      navTargetsByRole.get(fromRole)!.add(toRole);
    }
  };

  const reachableFromEntry = (): Set<string> => {
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e.to);
    }
    const seen = new Set<string>([entry]);
    const queue = [entry];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const nx of adj.get(cur) ?? []) if (!seen.has(nx)) { seen.add(nx); queue.push(nx); }
    }
    return seen;
  };

  // (a) connect any unreachable screen from the hub, inserting the link before
  //     the pinned bottom-nav so it reads as content, not a floating action.
  const seen = reachableFromEntry();
  // Hub for orphan links: prefer home, then dashboard — but ONLY if that screen
  // is itself reachable from the entry, otherwise the orphans we link to it would
  // stay stranded. The entry screen is reachable by definition, so it is the safe
  // fallback that guarantees every linked orphan becomes reachable.
  const preferredHub = idByRole.get("home") ?? idByRole.get("dashboard");
  const hubId = preferredHub && seen.has(preferredHub) ? preferredHub : entry;
  const hub = screenById.get(hubId);

  if (hub) {
    for (const screen of screens) {
      if (seen.has(screen.id) || screen.id === hub.id) continue;
      const label = "View " + screen.name;
      const link = c.card(label, {
        action: { type: "navigate", target: screen.id, label },
      });
      const navIdx = hub.components.findIndex((cmp) => cmp.type === "bottomNav");
      if (navIdx >= 0) hub.components.splice(navIdx, 0, link);
      else hub.components.push(link);
      addEdge(hub.id, screen.id, label);
    }
  }

  // (b) give any dead-end screen an explicit back exit.
  for (const screen of screens) {
    const isRoot = usesBottomNav && primaryDestinations.includes(screen.role);
    if (isRoot) continue;
    const hasExit = screen.components.some(
      (cmp) => cmp.action?.type === "navigate" || cmp.action?.type === "back" || cmp.action?.type === "restart",
    );
    if (!hasExit) {
      screen.components.push(c.button("Back", { type: "back" }, { variant: "outline" }));
    }
  }
}
