/**
 * Screen builders — one per screen role.
 *
 * Each builder receives a BuildContext and returns the ordered list of
 * components for that screen. Navigation actions are created via `ctx.navTo`,
 * which resolves a target ROLE to the concrete screen id (or a no-op if that
 * screen wasn't generated), so buttons always link to real screens.
 */
import type { Component, ComponentAction, ScreenRole } from "@/types/schema";
import type { AppContent } from "./content";
import { c } from "./factory";

export interface BuildContext {
  appName: string;
  appType: string;
  content: AppContent;
  /** resolve a target role to a navigate action (no-op if screen absent) */
  navTo: (role: ScreenRole, label?: string) => ComponentAction;
  hasScreen: (role: ScreenRole) => boolean;
  /** capabilities the ML layer detected (e.g. "reviews", "tracking"), used to
   *  surface requirement-driven UI sections (reviews list, etc.) */
  capabilities: Set<string>;
  /** bottom nav component (shared) or null */
  bottomNav: () => Component | null;
  /** the requirement's real subject, when the entity layer relabeled the
   *  browse/detail screens to it (e.g. {singular:"Coworker", plural:"Coworkers"});
   *  used only to keep body framing consistent with the relabeled screen name.
   *  Undefined on the normal path, so stock framing is unchanged. */
  subject?: { singular: string; plural: string };
  /** offline, actor-subject only: neutral sample rows for the browse list so a
   *  people-centric requirement ("coworkers") shows people, not stock domain
   *  cards. Undefined otherwise, so the domain sample data is used unchanged. */
  subjectItems?: Array<{ id: string; title: string; subtitle?: string }>;
}

type Builder = (ctx: BuildContext) => Component[];

const withNav = (ctx: BuildContext, comps: Component[]): Component[] => {
  const nav = ctx.bottomNav();
  return nav ? [...comps, nav] : comps;
};

/** Domain-appropriate label for the home feed's primary section. */
const FEATURED_LABEL: Record<string, string> = {
  "food-delivery": "Popular near you",
  ecommerce: "Trending now",
  fitness: "Today's workouts",
  education: "Continue learning",
  social: "Latest posts",
  media: "Recommended for you",
  travel: "Popular destinations",
  healthcare: "Top doctors",
  booking: "Available now",
  productivity: "Your tasks",
};

// ---------------------------------------------------------------------------
export const BUILDERS: Partial<Record<ScreenRole, Builder>> = {
  splash: (ctx) => [
    c.spacer(120),
    c.banner(ctx.appName, { tone: "morph" }),
    c.spacer(8),
    c.text("Loading your experience…", { muted: true, align: "center" }),
    c.spacer(120),
    c.button("Get started", ctx.navTo("login", "Enter"), { fullWidth: true }),
  ],

  login: (ctx) => [
    c.appbar("", {}),
    c.spacer(24),
    c.heading("Welcome back", { display: true }),
    c.text("Sign in to continue to " + ctx.appName, { muted: true }),
    c.spacer(20),
    c.input("Email address", { icon: "mail" }),
    c.input("Password", { icon: "lock" }),
    c.spacer(4),
    c.text("Forgot password?", { muted: true, align: "right", size: 13 }),
    c.spacer(12),
    c.button("Sign in", ctx.navTo(ctx.hasScreen("home") ? "home" : "dashboard", "Sign in")),
    ...(ctx.hasScreen("signup")
      ? [c.button("Create an account", ctx.navTo("signup", "Sign up"), { variant: "ghost" })]
      : []),
  ],

  signup: (ctx) => [
    c.appbar("Create account", { back: true }),
    c.spacer(12),
    c.heading("Let's get you set up"),
    c.text("It only takes a minute", { muted: true }),
    c.spacer(16),
    c.input("Full name", { icon: "user" }),
    c.input("Email address", { icon: "mail" }),
    c.input("Password", { icon: "lock" }),
    c.spacer(12),
    c.button("Create account", ctx.navTo(ctx.hasScreen("home") ? "home" : "dashboard", "Create account")),
  ],

  home: (ctx) => {
    const { content } = ctx;
    // Section heading label + whether the home feed leans grid (visual domains)
    // or list (text/among-items domains). Grid-forward homes feel richer for
    // food/commerce/travel/media; list-forward suits banking/education/social.
    const gridForward = ["food-delivery", "ecommerce", "travel", "media"].includes(ctx.appType);
    const featuredLabel = FEATURED_LABEL[ctx.appType] ?? "Popular";
    // Feed items open the detail view; if a domain has no `details` screen (e.g.
    // a social app that opens a conversation instead), fall back to whatever
    // item screen exists so the feed is never a set of dead taps.
    const itemTarget: ScreenRole | null =
      ctx.hasScreen("details") ? "details" : ctx.hasScreen("detailSecondary") ? "detailSecondary" : null;
    const itemAction = itemTarget ? ctx.navTo(itemTarget, "Open item") : undefined;
    return withNav(ctx, [
      c.appbar(ctx.appName, { trailingIcon: "bell" }),
      c.spacer(4),
      c.heading(content.heroTitle),
      c.text(content.heroSubtitle, { muted: true }),
      c.spacer(8),
      ...(ctx.hasScreen("search") ? [c.searchBar("Search " + ctx.appName), c.spacer(4)] : []),
      // categories as a scrollable chip row (was: empty gradient thumbnails)
      c.chipRow(content.categories),
      c.spacer(8),
      c.banner(content.heroTitle, { tone: "morph" }),
      c.spacer(8),
      c.text(featuredLabel, { size: 13, muted: true }),
      c.list(content.primaryList, {
        action: itemAction,
        columns: gridForward ? 2 : 1,
      }),
    ]);
  },

  dashboard: (ctx) => {
    const { content } = ctx;
    const isBanking = ctx.appType === "banking";
    const isFitness = ctx.appType === "fitness";
    // Banking leads with a hero balance card; fitness/productivity lead with the
    // greeting + a stat pair. The metric copy is domain-specific, not generic.
    const hero = isBanking
      ? [c.balanceCard(content.heroSubtitle, { label: content.heroTitle, trailing: "+2.4% this month" })]
      : [c.text(content.heroTitle, { muted: true, size: 13 }), c.heading(content.heroSubtitle)];
    const statPair = isBanking
      ? [{ id: "s1", title: "Income", subtitle: "+$3,200" }, { id: "s2", title: "Spending", subtitle: "-$842" }]
      : isFitness
      ? [{ id: "s1", title: "This week", subtitle: "4 sessions" }, { id: "s2", title: "Streak", subtitle: "6 days" }]
      : [{ id: "s1", title: "Done today", subtitle: "3 of 4" }, { id: "s2", title: "This week", subtitle: "82%" }];
    // Primary action for the dashboard, routed to a screen that actually exists.
    // Without this a sparse dashboard (e.g. banking with no details/list screen)
    // would strand the checkout/transfer flow — a dead-end. Falls back to details.
    const primaryTarget: ScreenRole | null =
      ctx.hasScreen("checkout") ? "checkout"
      : ctx.hasScreen("details") ? "details"
      : ctx.hasScreen("list") ? "list"
      : null;
    const ctaLabel = isBanking ? "Send money" : isFitness ? "Start workout" : ctx.appType === "productivity" ? "Add task" : "Continue";
    const cta = primaryTarget
      ? [c.button(ctaLabel, ctx.navTo(primaryTarget, ctaLabel), { icon: primaryTarget === "checkout" ? "send" : "arrow-right" }), c.spacer(8)]
      : [];
    // The recent list links to whatever detail-ish screen exists (details, else
    // the transaction/checkout step for banking), never to a missing screen.
    const listTarget: ScreenRole | null =
      ctx.hasScreen("details") ? "details" : ctx.hasScreen("checkout") ? "checkout" : null;
    return withNav(ctx, [
      c.appbar(ctx.appName, { trailingIcon: "bell" }),
      c.spacer(4),
      ...hero,
      c.spacer(12),
      c.list(statPair, { columns: 2 }),
      c.spacer(8),
      ...cta,
      ...(isFitness ? [c.progress("Weekly goal", 82), c.spacer(8)] : []),
      c.text(isBanking ? "Recent transactions" : "Recent activity", { size: 13, muted: true }),
      c.list(content.primaryList, listTarget ? { action: ctx.navTo(listTarget, "Open") } : {}),
    ]);
  },

  search: (ctx) => {
    const { content } = ctx;
    return withNav(ctx, [
      c.appbar("Search", {}),
      c.searchBar("Search " + ctx.appName),
      c.spacer(8),
      c.text("Browse categories", { size: 13, muted: true }),
      c.chipRow(content.categories),
      c.spacer(8),
      c.text("Results", { size: 13, muted: true }),
      c.list(content.primaryList, { action: ctx.navTo("details", "Open result") }),
    ]);
  },

  list: (ctx) => {
    const { content } = ctx;
    return withNav(ctx, [
      c.appbar(ctx.subject?.plural ?? content.categories[1] ?? "Browse", { back: true }),
      ...(ctx.hasScreen("search") ? [c.searchBar(ctx.subject ? "Filter " + ctx.subject.plural : "Filter")] : []),
      c.spacer(8),
      c.chipRow(content.categories),
      c.spacer(8),
      c.list(ctx.subjectItems ?? content.primaryList, {
        action: ctx.navTo("details", "View details"),
      }),
    ]);
  },

  details: (ctx) => {
    const { content } = ctx;
    // Actor-subject offline signal: the browse list was populated with neutral
    // people rows (see generator). When that happened, this detail screen is the
    // "open a person" destination, so it must show a PERSON — a name heading, the
    // subject as subtitle, a neutral subject-framed body — not the domain's stock
    // restaurant/product detail. This closes the actor flow (browse people → tap →
    // see a person, not a pizza). It also suppresses domain-only chrome (price tag,
    // attribute highlight chips, product rating) that reads wrong on a person.
    // Undefined on every normal path, so stock detail rendering is unchanged.
    const person = ctx.subjectItems && ctx.subject ? ctx.subjectItems[0] : null;
    // Primary CTA follows the domain's transaction verb (cart > checkout), else
    // opens messaging, else just returns. The label uses the domain CTA so a
    // doctor reads "Book appointment", a shop "Add to cart", etc.
    const primaryCta =
      ctx.hasScreen("cart")
        ? c.button("Add to cart", ctx.navTo("cart", "Add to cart"), { icon: "plus" })
        : ctx.hasScreen("checkout")
        ? c.button(ctx.appType === "travel" ? "Book now" : "Continue", ctx.navTo("checkout", "Book"), {})
        : ctx.hasScreen("detailSecondary")
        ? c.button("Message", ctx.navTo("detailSecondary", "Message"), { icon: "message" })
        : c.button("Continue", { type: "back" }, {});
    // If messaging exists but wasn't the primary CTA (e.g. a shop that ALSO has
    // chat), still expose it here so the messaging screen is never a dead branch.
    const secondaryCta =
      ctx.hasScreen("detailSecondary") && !(primaryCta.action?.target && primaryCta.content === "Message")
        ? [c.button("Message", ctx.navTo("detailSecondary", "Message"), { variant: "outline", icon: "message" })]
        : [];
    // Reviews/ratings UI — surfaced only when the ML layer detected a reviews
    // capability AND the domain has real review copy (never lorem, never for
    // domains where reviews make no sense — the capability is domain-gated).
    const reviews = content.reviews ?? [];
    const reviewsBlock =
      ctx.capabilities.has("reviews") && reviews.length > 0
        ? [
            c.text("Reviews", { size: 13, muted: true }),
            // rendered from text + rating primitives (not a list) so the review
            // body wraps naturally instead of truncating to one line
            ...reviews.flatMap((rv, i) => [
              ...(i > 0 ? [c.divider()] : []),
              c.text(rv.author, { size: 14 }),
              c.ratingStars(rv.rating),
              c.text(rv.text, { muted: true, size: 14 }),
            ]),
            c.spacer(12),
          ]
        : [];
    // header/body: person-framed for an actor subject, domain copy otherwise.
    const title = person ? person.title : content.detailTitle;
    const subtitle = person ? ctx.subject!.singular : content.detailSubtitle;
    const body = person
      ? "Part of your " + ctx.subject!.plural.toLowerCase() + ". Reach out to coordinate together."
      : content.detailBody;
    return [
      c.appbar("", { back: true }),
      c.image({ tone: "morph", height: 220 }),
      c.spacer(12),
      c.heading(title, { display: true }),
      c.text(subtitle, { muted: true }),
      ...(!person && content.primaryList[0]?.rating ? [c.spacer(6), c.ratingStars(content.primaryList[0].rating!)] : []),
      c.spacer(8),
      // domain-specific attribute chips (prep time, duration, materials, …) — a
      // person has none of these, so they're dropped on the actor-detail path
      ...(!person && content.detailHighlights.length ? [c.chipRow(content.detailHighlights, { active: -1 }), c.spacer(12)] : []),
      // real, domain-appropriate description — not "placeholder data" filler
      c.text(body, { size: 14 }),
      c.spacer(16),
      ...reviewsBlock,
      ...(!person && content.detailPrice ? [c.priceTag(content.detailPrice), c.spacer(12)] : []),
      primaryCta,
      ...secondaryCta,
    ];
  },

  detailSecondary: (ctx) => [
    c.appbar(ctx.content.detailTitle, { back: true }),
    c.spacer(8),
    c.list(
      ctx.content.primaryList.map((it) => ({ ...it, subtitle: "Message • " + (it.trailing ?? "now") })),
      {},
    ),
    c.spacer(8),
    c.input("Write a message…", { icon: "send" }),
  ],

  cart: (ctx) => {
    const { content } = ctx;
    return [
      c.appbar("Your cart", { back: true }),
      c.spacer(8),
      c.list(content.primaryList.slice(0, 2).map((it) => ({ ...it, trailing: it.price ?? "$12.90" })), {}),
      c.spacer(8),
      c.divider(),
      c.stat("Subtotal", content.detailPrice ?? "$27.80"),
      c.stat("Delivery", "$2.50"),
      c.spacer(12),
      c.button("Checkout", ctx.navTo("checkout", "Checkout"), { icon: "arrow-right" }),
    ];
  },

  checkout: (ctx) => [
    c.appbar(ctx.appType === "banking" ? "Send money" : "Checkout", { back: true }),
    c.spacer(8),
    ...(ctx.appType === "banking"
      ? [c.input("Recipient", { icon: "user" }), c.input("Amount", { icon: "dollar-sign", value: "$120.00" })]
      : [
          c.text("Delivery address", { size: 13, muted: true }),
          c.card("Home", { subtitle: "221B Baker Street", tone: "cyan" }),
          c.spacer(8),
          c.text("Payment", { size: 13, muted: true }),
          c.card("•••• 4242", { subtitle: "Visa • Expires 09/28", tone: "morph" }),
        ]),
    c.spacer(8),
    c.stat("Total", ctx.content.detailPrice ?? "$30.30"),
    c.spacer(12),
    c.button(ctx.appType === "banking" ? "Send" : "Place order", ctx.navTo("confirmation", "Confirm")),
  ],

  confirmation: (ctx) => {
    const homeTarget: ScreenRole = ctx.hasScreen("home") ? "home" : "dashboard";
    // If a tracking screen was generated, the confirmation's primary next step
    // is to track the order; "Back to home" becomes the secondary action.
    const cta = ctx.hasScreen("tracking")
      ? [
          c.button("Track order", ctx.navTo("tracking", "Track order"), { icon: "map-pin" }),
          c.button("Back to home", ctx.navTo(homeTarget, "Done"), { variant: "outline" }),
        ]
      : [
          c.button("Back to home", ctx.navTo(homeTarget, "Done"), {}),
          c.button("Done", { type: "restart" }, { variant: "ghost" }),
        ];
    return [
      c.spacer(80),
      c.banner("✓", { tone: "emerald" }),
      c.spacer(16),
      c.heading(ctx.appType === "banking" ? "Money sent" : "Order confirmed", { display: true }),
      c.text(
        ctx.appType === "banking"
          ? "Your transfer is on its way."
          : "Thanks! Your order is being prepared.",
        { muted: true, align: "center" },
      ),
      c.spacer(24),
      ...cta,
    ];
  },

  tracking: (ctx) => {
    const { content } = ctx;
    const steps = [
      { id: "t1", title: "Order confirmed", subtitle: "We've received your order", icon: "check" },
      { id: "t2", title: "Preparing", subtitle: content.trackingNote ?? "Your order is being prepared", icon: "clock" },
      { id: "t3", title: "On the way", subtitle: content.trackingEta ?? "Arriving soon", icon: "map-pin" },
      { id: "t4", title: "Delivered", subtitle: "Enjoy!", icon: "home" },
    ];
    return [
      c.appbar("Track Order", { back: true }),
      c.spacer(8),
      c.banner(content.trackingEta ?? "Arriving soon", { tone: "morph" }),
      c.spacer(12),
      c.progress("Delivery progress", 60),
      c.spacer(12),
      c.text("Order status", { size: 13, muted: true }),
      c.list(steps, {}),
      c.spacer(16),
      c.button("Back to home", ctx.navTo(ctx.hasScreen("home") ? "home" : "dashboard", "Done"), {}),
    ];
  },

  profile: (ctx) => {
    return withNav(ctx, [
      c.appbar("Profile", { trailingIcon: "settings" }),
      c.spacer(12),
      c.avatar("A"),
      c.spacer(8),
      c.heading("Alex Morgan"),
      c.text("alex@example.com", { muted: true, align: "center" }),
      c.spacer(16),
      c.list(
        [
          { id: "p1", title: "Edit profile", icon: "user" },
          { id: "p2", title: "Notifications", icon: "bell" },
          { id: "p3", title: "Payment methods", icon: "credit-card" },
          { id: "p4", title: "Help & support", icon: "help-circle" },
        ],
        {},
      ),
      c.spacer(8),
      c.toggle("Dark mode", ctx.appType === "social"),
      c.button("Log out", ctx.navTo("login", "Log out"), { variant: "outline" }),
    ]);
  },

  settings: (ctx) => [
    c.appbar("Settings", { back: true }),
    c.spacer(8),
    c.toggle("Push notifications", true),
    c.toggle("Email updates", false),
    c.toggle("Dark mode", true),
    c.divider(),
    c.list([{ id: "a1", title: "Privacy" }, { id: "a2", title: "About" }], {}),
    c.button("Log out", ctx.navTo("login", "Log out"), { variant: "outline" }),
  ],
};

/** Fallback for any role without a dedicated builder. */
export function genericScreen(ctx: BuildContext, name: string): Component[] {
  return withNav(ctx, [
    c.appbar(name, {}),
    c.spacer(12),
    c.heading(name),
    c.text("Generated screen.", { muted: true }),
    c.spacer(12),
    c.list(ctx.content.primaryList, {}),
  ]);
}
