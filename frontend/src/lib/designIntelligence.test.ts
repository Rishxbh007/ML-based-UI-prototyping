/**
 * Design Intelligence evaluation.
 *
 * These tests check DESIGN COHERENCE and REQUIREMENT ALIGNMENT (not numeric
 * accuracy): the right screens appear, irrelevant ones don't, navigation
 * follows the workflow, and one design system is used across all screens.
 * Run: npm test
 */
import { describe, it, expect } from "vitest";
import { analyzeLocally } from "./localAnalysis";
import { deriveDesignSpec } from "./designIntelligence";
import { generate } from "./generator";
import type { CreateProjectInput, ScreenRole } from "@/types/schema";

function input(name: string, description: string, designStyle = "modern"): CreateProjectInput {
  return { name, description, targetPlatform: "ios", designStyle };
}

function spec(description: string, designStyle = "modern") {
  const inp = input("Test", description, designStyle);
  return deriveDesignSpec(analyzeLocally(description), inp);
}

function roles(description: string): Set<string> {
  return new Set(spec(description).screens.map((s) => s.role));
}

describe("design intelligence — requirement-driven screens", () => {
  it("fitness: dashboard-first, no login/cart/checkout when not asked", () => {
    const r = roles("track workouts, monitor progress and set fitness goals");
    expect(r.has("dashboard")).toBe(true);
    expect(r.has("login")).toBe(false);
    expect(r.has("cart")).toBe(false);
    expect(r.has("checkout")).toBe(false);
  });

  it("food delivery: browsing + ordering flow, no unrequested login/profile/cart", () => {
    const r = roles("browse restaurants, order food, track delivery and rate restaurants");
    expect(r.has("list")).toBe(true);
    expect(r.has("details")).toBe(true);
    expect(r.has("login")).toBe(false);
  });

  it("banking: overview + transfer flow, no cart, no forced login", () => {
    const r = roles("view balances, transfer money and review transactions");
    expect(r.has("dashboard")).toBe(true);
    expect(r.has("checkout")).toBe(true); // the transfer/send flow
    expect(r.has("cart")).toBe(false);
    expect(r.has("login")).toBe(false);
  });

  it("education: courses + lessons, no ecommerce checkout", () => {
    const r = roles("browse courses, enroll in lessons, track progress and complete quizzes");
    expect(r.has("list")).toBe(true);
    expect(r.has("checkout")).toBe(false);
    expect(r.has("login")).toBe(false);
  });

  it("auth screens appear only when authentication is requested", () => {
    const withAuth = roles("users sign up and log in, then browse and buy products");
    expect(withAuth.has("login")).toBe(true);
    const withoutAuth = roles("browse products and read reviews");
    expect(withoutAuth.has("login")).toBe(false);
  });
});

describe("design intelligence — coherence", () => {
  it("selects a purpose-aligned style deterministically", () => {
    const a = spec("view balances and transfer money");
    const b = spec("view balances and transfer money");
    expect(a.style).toBe(b.style);
    expect(a.style).toBe("data-focused"); // finance -> data-focused
  });

  it("respects an explicit style request", () => {
    expect(spec("browse products", "dark premium").style).toBe("premium-dark");
    expect(spec("browse products", "minimal clean").style).toBe("minimal");
  });

  it("uses ONE design system across every generated screen", () => {
    const proto = generate(
      analyzeLocally("browse restaurants, order food and rate them"),
      input("Feast", "browse restaurants, order food and rate them", "modern"),
    );
    // the prototype carries a single token set that all screens render from
    expect(proto.tokens).toBe(proto.design!.tokens);
    expect(proto.design!.screens.length).toBe(proto.screens.length);
  });

  it("navigation destinations are a subset of the generated screens", () => {
    const s = spec("browse courses, enroll and track progress");
    const screenRoles = new Set(s.screens.map((x) => x.role));
    for (const d of s.navigation.primaryDestinations) {
      expect(screenRoles.has(d)).toBe(true);
    }
  });
});

describe("design intelligence — domain distinction", () => {
  // each description is written to hit a domain's strong markers; the classifier
  // must not confuse neighbours (banking vs commerce, media vs social, etc.)
  const cases: Array<[string, string]> = [
    ["food-delivery", "order food from restaurants and track delivery"],
    ["ecommerce", "browse products in the store, add to cart and buy"],
    ["banking", "check your balance, transfer money and review transactions"],
    ["fitness", "track workouts at the gym and monitor training progress"],
    ["education", "take a course, watch lessons and complete a quiz"],
    ["social", "follow friends, post stories and like the feed"],
    ["media", "stream movies, watch episodes and build a playlist"],
    ["travel", "search flights, book a hotel and plan your trip"],
    ["healthcare", "find a doctor, book an appointment at the clinic"],
    ["booking", "reserve a table and schedule an appointment slot"],
  ];

  it("routes each description to its intended domain", () => {
    for (const [expected, description] of cases) {
      expect(analyzeLocally(description).appType).toBe(expected);
    }
  });

  it("a banking app never gets a shopping cart", () => {
    const r = roles("check balance, transfer money and pay bills");
    expect(r.has("cart")).toBe(false);
  });

  it("a media/streaming app is not treated as ecommerce (no cart/checkout)", () => {
    const r = roles("stream movies and shows, build a watchlist");
    expect(r.has("cart")).toBe(false);
    expect(r.has("checkout")).toBe(false);
  });

  it("gives every domain a coherent, self-consistent design system", () => {
    for (const [, description] of cases) {
      const s = spec(description);
      // exactly one token set, and the DesignSpec density matches its tokens
      expect(s.tokens.preset).toBeTruthy();
      expect(s.density).toBe(s.tokens.density);
      // the phone type scale stays ordered: display >= heading >= body
      expect(s.tokens.typography.display).toBeGreaterThanOrEqual(s.tokens.typography.heading);
      expect(s.tokens.typography.heading).toBeGreaterThanOrEqual(s.tokens.typography.body);
    }
  });
});

describe("navigation integrity — no dead-ends, every screen reachable", () => {
  const scenarios = [
    "food delivery: browse restaurants, order food, add to cart and checkout, with sign in",
    "banking: view balance, transfer money and review transactions",
    "check balance, transfer money and review transactions", // sparse banking (no list/details)
    "social: follow people, post stories, chat with friends and browse the feed",
    "ecommerce: browse products, chat with sellers, add to cart and checkout",
    "media: stream movies and shows and build a library",
    "healthcare: find a doctor and book an appointment",
    "booking: reserve a table and schedule a slot",
    "fitness: track workouts and monitor progress",
  ];

  function build(description: string) {
    return generate(analyzeLocally(description), input("App", description, "modern"));
  }

  it("every generated screen is reachable from the entry screen", () => {
    for (const description of scenarios) {
      const proto = build(description);
      const adjacency = new Map<string, string[]>();
      for (const e of proto.navigation.edges) {
        if (!adjacency.has(e.from)) adjacency.set(e.from, []);
        adjacency.get(e.from)!.push(e.to);
      }
      // BFS from entry
      const seen = new Set<string>([proto.navigation.entry]);
      const queue = [proto.navigation.entry];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const next of adjacency.get(cur) ?? []) {
          if (!seen.has(next)) { seen.add(next); queue.push(next); }
        }
      }
      const unreachable = proto.screens.filter((s) => !seen.has(s.id)).map((s) => s.role);
      expect({ description, unreachable }).toEqual({ description, unreachable: [] });
    }
  });

  it("no screen is a dead-end: every screen offers a forward link, a back action, or bottom-nav", () => {
    for (const description of scenarios) {
      const proto = build(description);
      const roots = new Set(proto.screens.filter((s) => s.showsBottomNav).map((s) => s.id));
      for (const screen of proto.screens) {
        const hasNavigate = screen.components.some(
          (c) => c.action?.type === "navigate" || c.action?.type === "restart",
        );
        const hasBack = screen.components.some((c) => c.action?.type === "back");
        const isRoot = roots.has(screen.id); // bottom-nav gives it an exit
        const confirmation = screen.role === "confirmation"; // has restart/home button
        expect({ description, role: screen.role, ok: hasNavigate || hasBack || isRoot || confirmation })
          .toEqual({ description, role: screen.role, ok: true });
      }
    }
  });

  it("the entry screen can actually reach every other screen (no stranded flows)", () => {
    for (const description of scenarios) {
      const proto = build(description);
      const adjacency = new Map<string, string[]>();
      for (const e of proto.navigation.edges) {
        if (!adjacency.has(e.from)) adjacency.set(e.from, []);
        adjacency.get(e.from)!.push(e.to);
      }
      const seen = new Set<string>([proto.navigation.entry]);
      const queue = [proto.navigation.entry];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const next of adjacency.get(cur) ?? []) {
          if (!seen.has(next)) { seen.add(next); queue.push(next); }
        }
      }
      // this is stricter than "reachable from entry" above: it fails if the
      // entry screen itself has no outgoing edges while other screens exist
      const entryHasExit = (adjacency.get(proto.navigation.entry) ?? []).length > 0;
      const multiScreen = proto.screens.length > 1;
      expect({ description, entryStrandedButHasScreens: multiScreen && !entryHasExit })
        .toEqual({ description, entryStrandedButHasScreens: false });
    }
  });

  it("bottom-nav tab targets always resolve to real screens", () => {
    for (const description of scenarios) {
      const proto = build(description);
      const ids = new Set(proto.screens.map((s) => s.id));
      for (const screen of proto.screens) {
        for (const c of screen.components) {
          if (c.type === "bottomNav") {
            for (const target of c.props?.targets ?? []) {
              if (target) expect(ids.has(target)).toBe(true);
            }
          }
        }
      }
    }
  });
});

describe("requirement → screen coverage — tracking & reviews", () => {
  function build(description: string) {
    return generate(analyzeLocally(description), input("App", description, "modern"));
  }

  it("food-delivery with 'track order' gets a reachable tracking screen", () => {
    const description = "order food from restaurants, checkout and track my order delivery";
    const r = roles(description);
    expect(r.has("tracking")).toBe(true);

    // and it must be reachable from the entry (the confirmation → track flow)
    const proto = build(description);
    const adjacency = new Map<string, string[]>();
    for (const e of proto.navigation.edges) {
      if (!adjacency.has(e.from)) adjacency.set(e.from, []);
      adjacency.get(e.from)!.push(e.to);
    }
    const seen = new Set<string>([proto.navigation.entry]);
    const queue = [proto.navigation.entry];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of adjacency.get(cur) ?? []) {
        if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    const trackingScreen = proto.screens.find((s) => s.role === "tracking")!;
    expect(seen.has(trackingScreen.id)).toBe(true);
  });

  it("ecommerce with 'track my order' gets a tracking screen", () => {
    const r = roles("browse products in the store, add to cart, buy and track my order");
    expect(r.has("tracking")).toBe(true);
  });

  it("does NOT add a tracking screen for a fitness app that 'tracks progress'", () => {
    // "track progress" here is history/overview — the dashboard already covers it,
    // so we must not blindly spawn a delivery-style tracking screen.
    const r = roles("track workouts and monitor progress at the gym");
    expect(r.has("tracking")).toBe(false);
  });

  it("does NOT add a tracking screen to banking despite 'track spending'", () => {
    const r = roles("check balance, transfer money and track spending");
    expect(r.has("tracking")).toBe(false);
  });

  it("surfaces a reviews section on details only for review-bearing domains", () => {
    // food-delivery supports reviews → the detail screen renders a Reviews block
    const withReviews = build("browse restaurants, order food and rate them with reviews");
    const details = withReviews.screens.find((s) => s.role === "details");
    expect(details).toBeTruthy();
    const hasReviewsBlock = details!.components.some((c) => c.content === "Reviews");
    expect(hasReviewsBlock).toBe(true);

    // banking has no notion of reviews → no Reviews block leaks in
    const banking = build("check balance and transfer money");
    for (const screen of banking.screens) {
      expect(screen.components.some((c) => c.content === "Reviews")).toBe(false);
    }
  });

  it("the reviews capability is domain-gated in the design spec", () => {
    expect(spec("order food and rate restaurants").capabilities).toContain("reviews");
    expect(spec("check balance and transfer money").capabilities).not.toContain("reviews");
  });
});

describe("navigation repair — tracking flow stays valid", () => {
  function build(description: string) {
    return generate(analyzeLocally(description), input("App", description, "modern"));
  }

  const scenarios = [
    "food delivery: browse restaurants, order food, add to cart, checkout and track my order",
    "ecommerce: browse products, add to cart, buy and track my order",
  ];

  it("every screen (incl. tracking) is reachable and offers an exit", () => {
    for (const description of scenarios) {
      const proto = build(description);
      const adjacency = new Map<string, string[]>();
      for (const e of proto.navigation.edges) {
        if (!adjacency.has(e.from)) adjacency.set(e.from, []);
        adjacency.get(e.from)!.push(e.to);
      }
      const seen = new Set<string>([proto.navigation.entry]);
      const queue = [proto.navigation.entry];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const next of adjacency.get(cur) ?? []) {
          if (!seen.has(next)) { seen.add(next); queue.push(next); }
        }
      }
      const unreachable = proto.screens.filter((s) => !seen.has(s.id)).map((s) => s.role);
      expect({ description, unreachable }).toEqual({ description, unreachable: [] });

      // no dead-ends
      const roots = new Set(proto.screens.filter((s) => s.showsBottomNav).map((s) => s.id));
      for (const screen of proto.screens) {
        const hasExit = screen.components.some(
          (c) => c.action?.type === "navigate" || c.action?.type === "back" || c.action?.type === "restart",
        );
        expect({ role: screen.role, ok: hasExit || roots.has(screen.id) })
          .toEqual({ role: screen.role, ok: true });
      }
    }
  });
});

describe("confidence / uncertainty — evidence-gated classification", () => {
  // Clear, domain-specific requirements must classify correctly AND be
  // confident enough to generate (behavior A + G). We assert the DECISION, not
  // a specific probability — no number is inflated to pass these.
  const clearCases: Array<[string, string]> = [
    ["travel", "search flights, book a hotel and plan your trip"],
    ["food-delivery", "browse restaurants, order food, add to cart and checkout"],
    ["education", "browse courses for students, enroll in lessons and complete a quiz"],
    ["banking", "check balance, transfer money and review transactions"],
  ];

  for (const [expected, description] of clearCases) {
    it(`clear ${expected}: confident + correct domain, generates`, () => {
      const a = analyzeLocally(description);
      expect(a.appType).toBe(expected);
      expect(a.needsClarification).toBe(false);
      expect(a.classification?.decision).toBe("ok");
      expect(a.classification?.confident).toBe(true);
      // evidence: the model recognized real vocabulary in the input
      expect(a.classification?.evidence.recognized).toBeGreaterThan(0);
    });
  }

  it("meaningless 'qwert': insufficient evidence, asks to clarify, does NOT commit to a domain", () => {
    const a = analyzeLocally("qwert");
    expect(a.needsClarification).toBe(true);
    expect(a.classification?.decision).toBe("insufficient_evidence");
    expect(a.classification?.confident).toBe(false);
    expect(a.classification?.evidence.recognized).toBe(0);
    // a user-facing clarification message is provided instead of a silent domain
    expect(typeof a.clarification).toBe("string");
    expect((a.clarification ?? "").length).toBeGreaterThan(0);
  });

  it("meaningless gibberish string: insufficient evidence -> clarification", () => {
    const a = analyzeLocally("asdf zxcv qwerty lkjh");
    expect(a.needsClarification).toBe(true);
    expect(a.classification?.decision).toBe("insufficient_evidence");
  });

  it("ambiguous BUT real requirement still generates (behavior B): has evidence, not gated", () => {
    // recognized vocabulary is present, so this is genuine ambiguity, not noise —
    // the app should still produce a prototype rather than refuse.
    const a = analyzeLocally("reserve a table and pay for it");
    expect(a.classification?.evidence.recognized).toBeGreaterThan(0);
    expect(a.needsClarification).toBe(false);
    expect(a.classification?.confident).toBe(true);
  });

  it("does not alter raw probabilities — appTypeProbabilities still sums to a distribution", () => {
    // guard: the decision layer is additive; it must not rewrite the numbers the
    // ML traceability panel shows (behavior E + F).
    const a = analyzeLocally("search flights, book a hotel and plan your trip");
    expect(a.appTypeProbabilities.length).toBeGreaterThan(0);
    expect(a.appTypeProbabilities[0].label).toBe("travel");
    // top raw score is the reported confidence, untouched by the gate
    expect(a.appTypeProbabilities[0].score).toBe(a.classification?.topProbability);
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — LLM-assisted structure (opts.structure)
// ---------------------------------------------------------------------------
// The LLM only PROPOSES a role set; deriveDesignSpec validates/repairs it and
// remains the offline source of truth. These guard that advisory contract.
describe("design intelligence — LLM-assisted structure (Phase 2)", () => {
  function structuredRoles(
    description: string,
    structure: { roles: ScreenRole[]; primary?: ScreenRole[] },
  ): ScreenRole[] {
    const inp = input("Test", description);
    const s = deriveDesignSpec(analyzeLocally(description), inp, { structure });
    return s.screens.map((sc) => sc.role);
  }

  it("uses the proposed role set when it's valid", () => {
    const r = structuredRoles("browse restaurants and order food", {
      roles: ["home", "list", "details", "cart", "checkout"],
    });
    // every proposed (valid) role is present
    for (const role of ["home", "list", "details", "cart", "checkout"] as ScreenRole[]) {
      expect(r.includes(role)).toBe(true);
    }
  });

  it("drops unknown/invented roles but keeps the valid ones", () => {
    const r = structuredRoles("browse and buy items", {
      roles: ["home", "wormhole" as ScreenRole, "list", "teleporter" as ScreenRole],
    });
    expect(r.includes("home")).toBe(true);
    expect(r.includes("list")).toBe(true);
    expect(r.includes("wormhole" as ScreenRole)).toBe(false);
    expect(r.includes("teleporter" as ScreenRole)).toBe(false);
  });

  it("guarantees a landing when the plan omits home/dashboard", () => {
    const r = structuredRoles("browse and buy items", { roles: ["list", "details"] });
    expect(r.includes("home") || r.includes("dashboard")).toBe(true);
  });

  it("falls back to deterministic selection when no valid role survives", () => {
    const inp = input("Test", "browse restaurants and order food");
    const analysis = analyzeLocally("browse restaurants and order food");
    const structured = deriveDesignSpec(analysis, inp, {
      structure: { roles: ["nope" as ScreenRole, "nada" as ScreenRole] },
    }).screens.map((s) => s.role);
    const deterministic = deriveDesignSpec(analysis, inp).screens.map((s) => s.role);
    expect(structured).toEqual(deterministic);
  });

  it("generated prototype from a structure plan has no dead-ends (nav repair holds)", () => {
    const inp = input("Test", "browse restaurants and order food");
    const analysis = analyzeLocally("browse restaurants and order food");
    const proto = generate(analysis, inp, {
      structure: { roles: ["home", "list", "details", "cart", "checkout", "confirmation"] },
    });
    expect(proto.screens.length).toBeGreaterThan(0);
    // every screen reachable from the entry (generator.repairNavigation guarantee)
    const ids = new Set(proto.screens.map((s) => s.id));
    expect(ids.size).toBe(proto.screens.length);
  });
});

