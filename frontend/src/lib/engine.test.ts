/**
 * Unit tests for the analysis + generation + refinement logic (pure functions).
 * Run: npm test   (from frontend/)
 */
import { describe, it, expect } from "vitest";
import { analyzeLocally, domainVocabulary } from "./localAnalysis";
import { generate } from "./generator";
import { parseRefinementLocally, applyRefinement } from "./refine";
import { buildStructureProvenance } from "./structureDiagnostics";
import { extractEntities, deriveSubject, nameIsGrounded } from "./entityContent";
import type { StructurePlan } from "./designIntelligence";
import type { CreateProjectInput } from "@/types/schema";

const input: CreateProjectInput = {
  name: "Feast",
  description: "A food delivery app where users sign up, browse restaurants, search dishes, add to cart and checkout.",
  targetPlatform: "ios",
  designStyle: "warm modern",
};

describe("localAnalysis", () => {
  it("classifies a food-delivery description", () => {
    const a = analyzeLocally(input.description);
    expect(["food-delivery", "ecommerce"]).toContain(a.appType);
    expect(a.appTypeProbabilities.length).toBeGreaterThan(0);
  });

  it("extracts cart + checkout features and login action", () => {
    const a = analyzeLocally(input.description);
    const names = a.features.map((f) => f.name);
    expect(names).toContain("cart");
    expect(names).toContain("checkout");
    expect(a.actions).toContain("Login");
  });

  it("infers core screens", () => {
    const a = analyzeLocally(input.description);
    const roles = a.inferredScreens.map((s) => s.role);
    expect(roles).toContain("login");
    expect(roles).toContain("checkout");
  });
});

describe("generate", () => {
  const proto = generate(analyzeLocally(input.description), input);

  it("produces screens and a navigation graph", () => {
    expect(proto.screens.length).toBeGreaterThan(3);
    expect(proto.navigation.entry).toBeTruthy();
    expect(proto.navigation.edges.length).toBeGreaterThan(0);
  });

  it("only links to screens that exist (no dangling navigation)", () => {
    const ids = new Set(proto.screens.map((s) => s.id));
    for (const edge of proto.navigation.edges) {
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to)).toBe(true);
    }
    for (const screen of proto.screens) {
      for (const c of screen.components) {
        if (c.action?.type === "navigate" && c.action.target) {
          expect(ids.has(c.action.target)).toBe(true);
        }
      }
    }
  });

  it("is deterministic in structure for the same input", () => {
    const a = generate(analyzeLocally(input.description), input);
    const b = generate(analyzeLocally(input.description), input);
    expect(a.screens.map((s) => s.role)).toEqual(b.screens.map((s) => s.role));
    expect(a.tokens.preset).toEqual(b.tokens.preset);
  });
});

describe("refinement", () => {
  const proto = generate(analyzeLocally(input.description), input);

  it("parses common instructions", () => {
    expect(parseRefinementLocally("make it dark").op).toBe("toggle_dark");
    expect(parseRefinementLocally("add a settings screen").op).toBe("add_screen");
    expect(parseRefinementLocally("apply a minimal theme").op).toBe("set_theme");
  });

  it("applies a dark theme deterministically", () => {
    const res = applyRefinement(proto, parseRefinementLocally("make it dark"));
    expect(res.ok).toBe(true);
    expect(res.prototype.tokens.preset).toBe("premium-dark");
  });

  it("adds a settings screen and keeps navigation valid", () => {
    const res = applyRefinement(proto, { op: "add_screen", screen_role: "settings", note: "", source: "rule" });
    expect(res.ok).toBe(true);
    expect(res.prototype.screens.some((s) => s.role === "settings")).toBe(true);
    const ids = new Set(res.prototype.screens.map((s) => s.id));
    for (const e of res.prototype.navigation.edges) expect(ids.has(e.to)).toBe(true);
  });

  it("refuses to remove a core screen", () => {
    const res = applyRefinement(proto, { op: "remove_screen", screen_role: "home", note: "", source: "rule" });
    expect(res.ok).toBe(false);
  });
});

describe("confidence / out-of-scope abstention", () => {
  // A prompt from a domain the fixed vocabulary doesn't cover (astronomy) still
  // gets a confident-looking argmax off generic verbs, but almost none of it is
  // recognized. The coverage guard must abstain rather than render a wrong
  // prototype with false confidence (the reported "fitness" astronomy bug).
  const ASTRONOMY =
    "Create a mobile app for amateur astronomers to plan stargazing sessions. " +
    "Users should be able to discover visible celestial objects, check observation " +
    "conditions, save favorite objects, plan observation sessions, record observations, " +
    "learn about constellations, and track astronomical events such as meteor showers and eclipses.";

  it("abstains on an out-of-domain (astronomy) prompt", () => {
    const a = analyzeLocally(ASTRONOMY);
    expect(a.classification?.decision).toBe("out_of_scope");
    expect(a.needsClarification).toBe(true);
    expect(a.clarification).toBeTruthy();
    // low coverage is the signal, not a weak argmax
    expect(a.classification!.evidence.coverage).toBeLessThan(0.18);
  });

  it("abstains on other unsupported domains (weather, legal)", () => {
    const weather = analyzeLocally(
      "A weather app showing forecasts, radar precipitation maps, hourly temperature, " +
      "humidity, wind speed and severe storm alerts.",
    );
    const legal = analyzeLocally(
      "An app for lawyers to manage legal cases, track court dates, store case documents, " +
      "log billable hours and file motions with the clerk.",
    );
    expect(weather.needsClarification).toBe(true);
    expect(weather.classification?.decision).toBe("out_of_scope");
    expect(legal.needsClarification).toBe(true);
    expect(legal.classification?.decision).toBe("out_of_scope");
  });

  it("still accepts every supported in-domain prompt (no false abstention)", () => {
    const supported = [
      "A food delivery app where users sign up, browse restaurants, search dishes, add to cart and checkout.",
      "A fitness tracking app for college students to log workouts, track progress and follow plans.",
      "A mobile banking app to check balance, view transactions, transfer money and pay bills.",
      "An e-learning app where students browse courses, watch lessons, take quizzes and track progress.",
      "A travel app to discover destinations, book hotels and flights, plan trips and save an itinerary.",
      "A social app where users post photos, follow friends, like and comment, and share stories to a feed.",
      "A streaming app to watch movies and shows, browse by genre, build playlists and continue watching.",
      "An online store to browse products, add to wishlist, add to cart and checkout securely.",
    ];
    for (const desc of supported) {
      const a = analyzeLocally(desc);
      expect(a.classification?.decision).toBe("ok");
      expect(a.needsClarification).toBe(false);
    }
  });

  it("still flags meaningless input as insufficient evidence, not out-of-scope", () => {
    const a = analyzeLocally("qwert");
    expect(a.classification?.decision).toBe("insufficient_evidence");
    expect(a.needsClarification).toBe(true);
  });

  // The reported regression: a long, VERBOSE, but genuinely in-domain prompt was
  // wrongly abstained because its coverage ratio was diluted below the floor by
  // ordinary business English (office/team/split-the-bill), even though it named
  // many real food-delivery terms. out_of_scope now requires BOTH low coverage
  // AND few recognized terms in absolute, so this must generate, not clarify.
  it("does NOT abstain on a verbose in-domain (team-lunch food-delivery) prompt", () => {
    const teamLunch =
      "Create a food-delivery mobile app specifically for office employees ordering " +
      "lunch for their teams. Users should be able to create a team lunch group, invite " +
      "coworkers, collect individual meal selections, set a shared delivery deadline, " +
      "split the bill automatically, track everyone's selections, reorder previous team " +
      "lunches, and monitor the combined delivery status.";
    const a = analyzeLocally(teamLunch);
    expect(a.appType).toBe("food-delivery");
    expect(a.classification?.decision).toBe("ok");
    expect(a.needsClarification).toBe(false);
    // The coverage ratio alone WOULD have tripped the floor; the absolute
    // recognized-term count is what keeps this in-domain prompt trusted.
    expect(a.classification!.evidence.coverage).toBeLessThan(0.18);
    expect(a.classification!.evidence.recognized).toBeGreaterThanOrEqual(5);
  });

  it("does NOT abstain on other verbose in-domain prompts (banking, fitness)", () => {
    const banking = analyzeLocally(
      "Create a mobile banking application for working professionals who want to manage " +
      "their household finances. Users should be able to check their account balance, view " +
      "recent transactions, transfer money between accounts, pay monthly bills automatically, " +
      "set spending budgets by category, and receive alerts about unusual activity.",
    );
    const fitness = analyzeLocally(
      "Build a fitness tracking app for busy people who exercise at home. Members can log " +
      "their daily workouts, track calories burned, follow structured training plans, set " +
      "weekly goals, monitor progress over time, and compete with friends on a leaderboard.",
    );
    expect(banking.classification?.decision).toBe("ok");
    expect(banking.needsClarification).toBe(false);
    expect(fitness.classification?.decision).toBe("ok");
    expect(fitness.needsClarification).toBe(false);
  });
});

describe("structure provenance (Phase 2 diagnostic)", () => {
  // These tests pin the GENERIC set-difference logic of the diagnostic — no
  // domain, prompt, or specific role is hardcoded into the implementation. They
  // prove it correctly localises where structure is kept vs lost.
  const analysis = analyzeLocally(input.description);

  it("on the fallback path, reports the deterministic set as repair-added (no LLM proposal)", () => {
    const proto = generate(analysis, input);
    const prov = buildStructureProvenance({
      appType: analysis.appType,
      source: "fallback",
      proposedRoles: [],
      plan: null,
      prototype: proto,
    });
    expect(prov.source).toBe("fallback");
    expect(prov.rawProposed).toEqual([]);
    expect(prov.validated).toEqual([]); // applyStructure not applicable without a plan
    expect(prov.dropped).toEqual([]);
    expect(prov.finalRendered.length).toBeGreaterThan(0);
    // with no LLM proposal, every rendered role is a deterministic addition
    expect(prov.repairAdded).toEqual(prov.finalRendered);
    // bottom-nav roles are always a subset of what was rendered
    for (const r of prov.bottomNav) expect(prov.finalRendered).toContain(r);
  });

  it("on the LLM path, surfaces dropped (unknown-vocab) and repair-added (guaranteed landing)", () => {
    // A proposal that (a) contains a role outside the known vocabulary and
    // (b) omits any landing — modelling exactly what validation must fix.
    const plan: StructurePlan = { roles: ["search", "cart", "checkout"], primary: ["search"] };
    const rawProposed = ["search", "cart", "checkout", "split_bill"]; // 'split_bill' is not a ScreenRole
    const proto = generate(analysis, input, { structure: plan });

    const prov = buildStructureProvenance({
      appType: analysis.appType,
      source: "llm",
      proposedRoles: rawProposed,
      plan,
      prototype: proto,
    });

    expect(prov.source).toBe("llm");
    // (3) the unknown-vocabulary role is reported as dropped by validation
    expect(prov.dropped).toContain("split_bill");
    expect(prov.validated).not.toContain("split_bill");
    // (4) validation guaranteed a landing the proposal never asked for
    const landing = prov.finalRendered.includes("home") ? "home" : "dashboard";
    expect(prov.repairAdded).toContain(landing);
    // the generator adds screens for exactly the validated roles — nothing after
    expect(prov.validated).toEqual(prov.finalRendered);
    expect(prov.addedAfterValidation).toEqual([]);
  });
});

describe("entity-driven content (generic, deterministic)", () => {
  // The relabel layer reads the requirement's real subject nouns and retitles
  // the generic browse/detail screens. Assertions are generic: no domain or
  // screen name is hardcoded in the implementation — every expected name is
  // derived from a word the prompt itself contains.
  const teamLunch =
    "Create a food-delivery mobile app specifically for office employees ordering " +
    "lunch for their teams. Users should be able to create a team lunch group, invite " +
    "coworkers, collect individual meal selections, set a shared delivery deadline, " +
    "split the bill automatically, track everyone's selections, reorder previous team " +
    "lunches, and monitor the combined delivery status.";

  it("populates analysis.entities offline (was always empty before)", () => {
    const a = analyzeLocally(teamLunch);
    expect(a.entities.length).toBeGreaterThan(0);
    // the extractor drops meta/verb tokens and keeps real subject nouns
    const texts = a.entities.map((e) => e.text);
    expect(texts).toContain("coworker");
    expect(texts).not.toContain("create"); // a verb, never an entity
    expect(texts).not.toContain("app"); // a meta noun, never an entity
  });

  it("extractEntities is deterministic and singularizes heads", () => {
    const a = extractEntities(teamLunch);
    const b = extractEntities(teamLunch);
    expect(a).toEqual(b);
    // "coworkers"/"lunches" are counted under their singular head
    expect(a.map((e) => e.text)).toContain("coworker");
  });

  it("derives a domain-foreign subject and prefers a collection-like kind", () => {
    const a = analyzeLocally(teamLunch);
    const subject = deriveSubject(a.entities, domainVocabulary(a.appType));
    expect(subject).not.toBeNull();
    // "coworker" (an actor) outranks "group"/"bill"/"lunch" as the browse subject
    expect(subject!.singular).toBe("Coworker");
    expect(subject!.plural).toBe("Coworkers");
  });

  it("nameIsGrounded gates on the requirement's own words", () => {
    // the team-lunch prompt never says "restaurant" -> the stock name is a
    // template assumption and NOT grounded, so it may be relabeled...
    expect(nameIsGrounded("Restaurants", teamLunch)).toBe(false);
    // ...but a prompt that really says "restaurants" grounds the stock name.
    expect(nameIsGrounded("Restaurants", "browse restaurants and order food")).toBe(true);
    // generic filler-only names ("Details") are never considered grounded
    expect(nameIsGrounded("Details", "anything at all")).toBe(false);
  });

  it("relabels the generic browse/detail screens with the entity subject", () => {
    const a = analyzeLocally(teamLunch);
    expect(a.appType).toBe("food-delivery"); // still classified into a known domain
    // Force the browse/detail screens into the set (mirrors the LLM-structure /
    // richer-prompt path that produced the user's observed 13-screen result).
    // The input's description MUST match the analyzed text — that is the real
    // contract (CreatePage analyzes and generates from the same requirement).
    const tlInput = { ...input, description: teamLunch };
    const plan: StructurePlan = { roles: ["home", "search", "list", "details", "cart", "checkout"], primary: ["home"] };
    const proto = generate(a, tlInput, { structure: plan });
    const list = proto.screens.find((s) => s.role === "list");
    const details = proto.screens.find((s) => s.role === "details");
    // the stock food template would read "Restaurants"/"Restaurant"; the entity
    // layer surfaces the requirement's real subject instead
    expect(list).toBeTruthy();
    expect(details).toBeTruthy();
    expect(list!.name).toBe("Coworkers");
    expect(details!.name).toBe("Coworker");
  });

  it("does NOT relabel when the domain name is grounded (no regression)", () => {
    // A plain food prompt that really says "restaurants"/"dishes": every strong
    // subject is part of the food-delivery vocabulary AND the stock name is
    // grounded, so the domain names must be kept.
    const desc = "A food delivery app to browse restaurants, search dishes and order food for delivery.";
    const a = analyzeLocally(desc);
    const plan: StructurePlan = { roles: ["home", "search", "list", "details", "cart", "checkout"], primary: ["home"] };
    const proto = generate(a, { ...input, description: desc }, { structure: plan });
    const list = proto.screens.find((s) => s.role === "list");
    expect(list!.name).toBe("Restaurants");
  });

  it("relabeling keeps navigation valid (no dangling links)", () => {
    const plan: StructurePlan = { roles: ["home", "search", "list", "details", "cart", "checkout"], primary: ["home"] };
    const proto = generate(analyzeLocally(teamLunch), { ...input, description: teamLunch }, { structure: plan });
    const ids = new Set(proto.screens.map((s) => s.id));
    for (const e of proto.navigation.edges) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
  });

  it("does NOT relabel abstained/meaningless input", () => {
    // "qwert" -> insufficient_evidence, so the classifier is not "ok" and the
    // relabel gate never fires: the domain's default browse name is kept.
    const a = analyzeLocally("qwert");
    expect(a.classification?.decision).not.toBe("ok");
    const plan: StructurePlan = { roles: ["home", "list", "details"], primary: ["home"] };
    const proto = generate(a, { ...input, description: "qwert" }, { structure: plan });
    const list = proto.screens.find((s) => s.role === "list");
    // never a subject derived from the junk token
    expect(list!.name).not.toBe("Qwerts");
  });

  it("cleans possessives, mangled plurals and descriptors out of entities", () => {
    const texts = extractEntities(teamLunch).map((e) => e.text);
    // possessive "everyone's" collapses to the meta word "everyone" and is dropped
    expect(texts).not.toContain("everyone'");
    expect(texts).not.toContain("everyone");
    // "previous" is a descriptor, not a subject, and must not be mangled to "previou"
    expect(texts).not.toContain("previou");
    expect(texts).not.toContain("previous");
    // real plural heads still singularize correctly
    expect(texts).toContain("selection"); // from "selections"
    expect(texts).toContain("coworker"); // from "coworkers"
  });

  it("singularizes real plurals without corrupting non-plural endings", () => {
    // -ous/-us/-is/-ics/-ss endings are not plurals and must be left intact
    // (verified indirectly: none of these appear mangled as subjects)
    const status = extractEntities("Users monitor delivery status and analysis metrics.");
    const t = status.map((e) => e.text);
    expect(t).toContain("status"); // not "statu"
    expect(t).not.toContain("statu");
  });

  it("frames the browse screen body with the applied subject (not stale category)", () => {
    // when the entity layer relabels the list to the requirement's subject, the
    // browse screen's app bar follows the subject instead of a stale food category
    const plan: StructurePlan = { roles: ["home", "search", "list", "details", "cart", "checkout"], primary: ["home"] };
    const proto = generate(analyzeLocally(teamLunch), { ...input, description: teamLunch }, { structure: plan });
    const list = proto.screens.find((s) => s.role === "list");
    const appbar = list!.components.find((cmp) => cmp.type === "appbar");
    expect(appbar).toBeTruthy();
    expect(appbar!.content).toBe("Coworkers");
  });

  it("shows neutral people rows for an ACTOR subject on the offline browse list", () => {
    // team-lunch's strongest foreign subject is "coworker" (an actor). Offline
    // (no LLM content override) the browse list should surface neutral people
    // rows labelled with the subject, not the domain library's food/product cards.
    const plan: StructurePlan = { roles: ["home", "search", "list", "details", "cart", "checkout"], primary: ["home"] };
    const proto = generate(analyzeLocally(teamLunch), { ...input, description: teamLunch }, { structure: plan });
    const list = proto.screens.find((s) => s.role === "list");
    const listComp = list!.components.find((cmp) => cmp.type === "list");
    expect(listComp).toBeTruthy();
    const items = listComp!.props?.items ?? [];
    expect(items.length).toBeGreaterThan(0);
    // rows are people labelled with the singular subject, not domain sample cards
    expect(items[0].title).toBe("Alex Morgan");
    expect(items.every((it) => it.subtitle === "Coworker")).toBe(true);
  });

  it("does NOT swap in people rows for a grounded/non-actor subject", () => {
    // a plain food prompt keeps its domain sample list (restaurants/dishes), never
    // the neutral people rows — the actor-list swap is gated to actor subjects.
    const desc = "A food delivery app to browse restaurants, search dishes and order food for delivery.";
    const plan: StructurePlan = { roles: ["home", "search", "list", "details", "cart", "checkout"], primary: ["home"] };
    const proto = generate(analyzeLocally(desc), { ...input, description: desc }, { structure: plan });
    const list = proto.screens.find((s) => s.role === "list");
    const listComp = list!.components.find((cmp) => cmp.type === "list");
    const items = listComp!.props?.items ?? [];
    expect(items.every((it) => it.title !== "Alex Morgan")).toBe(true);
  });

  it("frames the DETAILS screen around a person for an actor subject (offline)", () => {
    // closing the actor flow: when the browse list shows people, tapping through
    // must open a person, not the domain's stock restaurant detail. The heading is
    // a person name, the subtitle is the subject, and domain-only chrome (price
    // tag) is suppressed because it reads wrong on a person.
    const plan: StructurePlan = { roles: ["home", "search", "list", "details", "cart", "checkout"], primary: ["home"] };
    const proto = generate(analyzeLocally(teamLunch), { ...input, description: teamLunch }, { structure: plan });
    const details = proto.screens.find((s) => s.role === "details");
    const heading = details!.components.find((cmp) => cmp.type === "heading");
    expect(heading!.content).toBe("Alex Morgan");
    // the subject appears as the subtitle text right after the heading
    const hasSubjectSubtitle = details!.components.some((cmp) => cmp.type === "text" && cmp.content === "Coworker");
    expect(hasSubjectSubtitle).toBe(true);
    // no price tag on a person
    expect(details!.components.some((cmp) => cmp.type === "priceTag")).toBe(false);
  });

  it("keeps the domain detail (title + price) for a grounded/non-actor subject", () => {
    // the person-detail path must NOT fire for a plain food prompt: the detail
    // screen keeps the domain's own title and price tag.
    const desc = "A food delivery app to browse restaurants, search dishes and order food for delivery.";
    const plan: StructurePlan = { roles: ["home", "search", "list", "details", "cart", "checkout"], primary: ["home"] };
    const proto = generate(analyzeLocally(desc), { ...input, description: desc }, { structure: plan });
    const details = proto.screens.find((s) => s.role === "details");
    const heading = details!.components.find((cmp) => cmp.type === "heading");
    expect(heading!.content).not.toBe("Alex Morgan");
    expect(details!.components.some((cmp) => cmp.type === "priceTag")).toBe(true);
  });
});
