/**
 * Local analysis fallback (TypeScript mirror of the backend keyword pipeline).
 *
 * Used when the FastAPI backend / trained model isn't reachable, so the whole
 * describe -> analyze -> generate flow still works offline. When the backend
 * IS running, the app uses the real trained classifier via the API instead;
 * this is clearly labeled as the fallback in the pipeline field.
 *
 * This is deliberately more than flat keyword counting: it uses WEIGHTED signal
 * words (strong domain markers count more than incidental ones) so overlapping
 * vocabulary doesn't misroute a domain — e.g. "account"/"payment" appear in both
 * banking and commerce, but "transfer"/"balance" are strong banking markers that
 * win, so a banking app is never mistaken for a shop. Features are then GATED by
 * the resolved domain, so a banking app never acquires a shopping cart just
 * because the word "add" appeared. It stays fully deterministic and rule-based
 * (no runtime ML/LLM) — the trained model is the backend's job, not this fallback.
 */
import type { RequirementAnalysis, ScreenRole } from "@/types/schema";
import { extractEntities } from "./entityContent";

/** Weighted domain markers: strong words (weight 3) disambiguate; supporting
 *  words (weight 1) reinforce. Highest total weight wins. */
interface DomainSpec {
  strong: string[];
  support: string[];
}

const DOMAINS: Record<string, DomainSpec> = {
  "food-delivery": {
    strong: ["restaurant", "food", "meal", "dish", "cuisine", "takeout", "delivery"],
    support: ["order", "eat", "menu", "kitchen", "chef", "grocery"],
  },
  fitness: {
    strong: ["workout", "exercise", "gym", "fitness", "training"],
    support: ["run", "calorie", "steps", "rep", "muscle", "cardio", "goal"],
  },
  banking: {
    strong: ["bank", "transfer", "balance", "transaction", "wallet"],
    support: ["money", "payment", "fund", "bill", "spending", "budget", "card"],
  },
  ecommerce: {
    strong: ["shop", "product", "store", "catalog", "wishlist"],
    support: ["buy", "cart", "purchase", "checkout", "brand", "sale"],
  },
  education: {
    strong: ["course", "lesson", "learn", "quiz", "tutor"],
    support: ["student", "study", "exam", "class", "enroll", "curriculum"],
  },
  social: {
    strong: ["post", "follow", "feed", "friend", "story"],
    support: ["share", "like", "comment", "profile", "community", "network"],
  },
  media: {
    strong: ["stream", "video", "movie", "episode", "podcast", "playlist"],
    support: ["watch", "show", "music", "song", "listen", "series", "channel"],
  },
  travel: {
    strong: ["flight", "hotel", "trip", "destination", "vacation"],
    support: ["travel", "tour", "stay", "itinerary", "explore", "getaway"],
  },
  healthcare: {
    strong: ["doctor", "patient", "clinic", "prescription", "medical", "symptom"],
    support: ["appointment", "health", "diagnosis", "pharmacy", "care", "wellness"],
  },
  booking: {
    strong: ["appointment", "reserve", "reservation", "booking", "slot"],
    support: ["schedule", "calendar", "table", "availability", "date", "time"],
  },
  productivity: {
    strong: ["task", "todo", "note", "reminder", "habit"],
    support: ["project", "planner", "schedule", "list", "productivity", "deadline"],
  },
};

/**
 * The recognized vocabulary of a single domain (strong + support markers).
 * Exposed read-only so the entity layer can tell whether a requirement's
 * subject is one the domain template already accounts for (in which case its
 * stock screen names are correct) or a foreign subject worth surfacing. Returns
 * an empty set for unknown app types. No behavior change to classification.
 */
export function domainVocabulary(appType: string): Set<string> {
  const spec = DOMAINS[appType];
  return spec ? new Set([...spec.strong, ...spec.support]) : new Set<string>();
}

/**
 * Feature vocabulary. Cart is intentionally NARROW (cart/basket/bag/wishlist —
 * NOT "add", which is too generic and would wrongly trigger for "add money" or
 * "add task"). Payments is separate from cart so a banking transfer flow is
 * detected without implying a shopping cart.
 */
const FEATURE_KEYWORDS: Record<string, string[]> = {
  authentication: ["login", "signin", "sign", "signup", "register", "auth"],
  search: ["search", "find", "discover", "browse", "explore", "filter"],
  listing: ["list", "catalog", "feed", "restaurant", "product", "course", "browse", "movie", "workout", "task", "todo", "note"],
  details: ["detail", "details", "view", "info", "description"],
  cart: ["cart", "basket", "bag", "wishlist"],
  checkout: ["checkout", "order", "pay", "purchase", "buy", "reserve", "book"],
  tracking: ["track", "tracking", "progress", "status", "monitor", "history"],
  reviews: ["review", "rate", "rat", "feedback", "star", "testimonial"],
  profile: ["profile", "account", "settings"],
  payments: ["transfer", "money", "wallet", "transaction", "bill", "fund", "send"],
  messaging: ["chat", "message", "comment", "reply", "dm"],
  social: ["follow", "like", "share", "post", "friend", "feed", "story"],
  content: ["lesson", "course", "video", "quiz", "workout", "exercise", "episode", "article"],
  booking: ["book", "booking", "reserve", "reservation", "schedule", "appointment", "slot"],
  dashboard: ["dashboard", "overview", "summary", "stats", "insight", "chart", "balance"],
};

/** Features that only make sense for certain domains. Prevents cross-domain
 *  bleed (e.g. a "cart" for a banking app, "payments"/checkout for a course app). */
const FEATURE_DOMAIN_GATE: Record<string, string[]> = {
  cart: ["food-delivery", "ecommerce"],
  // checkout stays broad (transfer/booking are checkout-shaped) but never for
  // pure content/social/media domains where nothing is purchased inline.
  checkout: ["food-delivery", "ecommerce", "banking", "travel", "booking", "healthcare"],
  payments: ["banking", "food-delivery", "ecommerce", "travel"],
  // reviews/ratings belong to domains where users evaluate items they consume;
  // never for banking (you don't "review" a transfer) or pure productivity.
  reviews: ["food-delivery", "ecommerce", "travel", "healthcare", "education", "media", "booking", "fitness"],
  social: ["social", "media"],
};

const ACTION_KEYWORDS: Record<string, string[]> = {
  Login: ["login", "signin", "sign"],
  "Sign up": ["signup", "register"],
  Search: ["search", "find", "discover", "browse"],
  Select: ["select", "choose", "pick", "view", "open"],
  "Add to cart": ["cart", "basket", "bag"],
  "Checkout / Pay": ["checkout", "pay", "payment", "purchase", "buy", "order"],
  "Book / Reserve": ["book", "reserve", "schedule", "appointment"],
  "Transfer money": ["transfer", "send", "fund"],
  Track: ["track", "monitor", "progress"],
  "Rate / Review": ["review", "rate", "rat", "feedback", "star", "testimonial"],
  "Post / Share": ["post", "share", "upload"],
  "Watch / Listen": ["watch", "stream", "listen", "play"],
};

const PURPOSE: Record<string, string> = {
  "food-delivery": "Let users discover restaurants and order food for delivery.",
  fitness: "Help users track workouts and monitor their fitness progress.",
  banking: "Let users manage accounts, transfer money and track spending.",
  ecommerce: "Let users browse products and make purchases.",
  education: "Let users take courses and track their learning.",
  social: "Let users share content and connect with others.",
  media: "Let users stream and discover video, music and shows.",
  travel: "Let users discover destinations and book travel.",
  healthcare: "Let users find doctors, book appointments and manage their care.",
  booking: "Let users find availability and make reservations.",
  productivity: "Help users organize tasks and stay productive.",
};

function tokenize(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z][a-z'-]+/g) ?? [];
  const out: string[] = [];
  for (const w of words) {
    // aggressive stem (existing behaviour: strips ing|ies|ed|es|s; ies->y)
    out.push(w.replace(/(ing|ies|ed|es|s)$/i, (m) => (m === "ies" ? "y" : "")));
    // conservative de-plural: also emit the word with a single trailing "s"
    // removed, so plurals of "-e" nouns match their singular keyword. The
    // aggressive rule mangles those ("movies"->"movy", "episodes"->"episod");
    // this recovers "movie"/"episode". Purely additive — it only widens recall
    // against the fixed keyword vocabulary, it can't remove an existing match.
    if (w.endsWith("s") && w.length > 3) out.push(w.slice(0, -1));
  }
  return out;
}

function targetUsers(text: string): string {
  const m = text.toLowerCase().match(/\bfor ([a-z][a-z ]*?)(?=\s+(?:where|who|that|to|with|and|,|\.)|$)/);
  if (m) {
    const who = m[1].replace(/\b(app|application|users?)\b$/, "").trim();
    if (who.length > 2 && who.length < 40) return who;
  }
  return "general mobile users";
}

/**
 * Domains that lead with a metrics/overview dashboard rather than a browse hub.
 * Used both here (screen hints) and mirrored in designIntelligence.
 */
const APPTYPE_HINTS: Record<string, ScreenRole[]> = {
  "food-delivery": ["home", "search", "list", "details", "cart", "checkout", "confirmation"],
  ecommerce: ["home", "search", "list", "details", "cart", "checkout", "confirmation"],
  fitness: ["dashboard", "list", "details", "profile"],
  banking: ["dashboard", "details", "checkout", "confirmation", "profile"],
  education: ["home", "search", "list", "details", "profile"],
  social: ["home", "search", "details", "detailSecondary", "profile"],
  media: ["home", "search", "list", "details", "profile"],
  travel: ["home", "search", "list", "details", "checkout", "confirmation"],
  healthcare: ["home", "search", "list", "details", "checkout", "confirmation", "profile"],
  booking: ["home", "search", "list", "details", "checkout", "confirmation"],
  productivity: ["dashboard", "details", "profile"],
};

const FEATURE_SCREENS: Record<string, ScreenRole[]> = {
  authentication: ["login", "signup"],
  search: ["search"],
  listing: ["list"],
  details: ["details"],
  cart: ["cart"],
  checkout: ["checkout", "confirmation"],
  payments: ["checkout"],
  tracking: ["dashboard"],
  reviews: ["details"],
  dashboard: ["dashboard"],
  content: ["details"],
  booking: ["details", "checkout", "confirmation"],
  profile: ["profile"],
  social: ["home"],
  messaging: ["detailSecondary"],
};

const SCREEN_ORDER: ScreenRole[] = [
  "splash", "onboarding", "login", "signup", "home", "dashboard",
  "search", "list", "details", "detailSecondary", "cart", "checkout",
  "confirmation", "tracking", "profile", "settings",
];

const REASONS: Partial<Record<ScreenRole, string>> = {
  splash: "Every app opens with a brief branded splash.",
  login: "An authentication feature was detected in the requirement.",
  signup: "Sign-up follows from the account/authentication feature.",
  home: "Primary landing screen for the app's core experience.",
  dashboard: "A tracking/overview feature implies a metrics dashboard.",
  search: "A search/discovery feature was detected.",
  list: "A catalog/feed feature was detected.",
  details: "Users view item/content details.",
  cart: "A cart/basket feature was detected.",
  checkout: "A checkout/payment/booking feature was detected.",
  confirmation: "A successful transaction needs a confirmation screen.",
  tracking: "An order/delivery-tracking feature was detected.",
  profile: "A profile/account feature was detected.",
  detailSecondary: "Messaging needs a conversation screen.",
};

/** Score every domain by weighted marker hits; return sorted probabilities. */
function classifyDomain(tokens: Set<string>): { label: string; score: number }[] {
  const raw = Object.entries(DOMAINS).map(([label, spec]) => {
    const strong = spec.strong.reduce((n, k) => n + (tokens.has(k) ? 3 : 0), 0);
    const support = spec.support.reduce((n, k) => n + (tokens.has(k) ? 1 : 0), 0);
    return { label, weight: strong + support };
  });
  const total = raw.reduce((n, s) => n + s.weight, 0) || 1;
  return raw
    .map((s) => ({ label: s.label, score: Math.round((s.weight / total) * 1000) / 1000 }))
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Confidence / uncertainty — mirrors the backend policy (classifier.py) so the
// offline fallback behaves consistently: meaningless or unsupported input must
// produce LOW confidence and ask the user to clarify, rather than silently
// defaulting to a domain. No score is modified — this only classifies the
// decision. Thresholds match the backend defaults for parity.
// ---------------------------------------------------------------------------
const TOP_PROB_FLOOR = 0.28;
const MARGIN_FLOOR = 0.08;
const MIN_RECOGNIZED = 1;
// Out-of-scope guard (mirrors classifier.py). A prompt from an unsupported
// domain (e.g. astronomy) still produces a confident-looking weighted-keyword
// argmax off a couple of generic verbs, so top-prob/margin can't catch it.
// Coverage can: when enough of the description is analyzed but only a small
// share of its tokens are recognizable vocabulary, the input is largely foreign
// and we abstain instead of rendering a wrong prototype. The MIN_ANALYZED gate
// spares short valid prompts whose stopwords would otherwise deflate the ratio.
// Floors are measured against this offline vocabulary (the denominator here
// includes stopwords, so coverage runs lower than the backend's TF-IDF figure);
// 0.18 sits well below every seed in-domain prompt (lowest ~0.26) yet far above
// the reported astronomy prompt (~0.08).
//
// MIN_RECOGNIZED_IN_SCOPE is the second half of the guard and the fix for the
// opposite failure: a long, verbose, but genuinely in-domain prompt (e.g. a
// food-delivery app for office teams: "create a lunch group, invite coworkers,
// split the bill, set a delivery deadline...") is full of ordinary business
// English outside the keyword vocabulary, so its coverage RATIO drops below the
// floor even though it names several real domain terms. The ratio penalizes
// verbosity; absolute recognized count does not. Measured offline: the reported
// team-lunch prompt recognizes 7 terms (coverage 0.167), whereas astronomy=3,
// weather=1 and legal=3. So we only abstain when coverage is low AND fewer than
// MIN_RECOGNIZED_IN_SCOPE terms are recognized in absolute -- catching foreign
// prompts (<=3 recognized) while never rejecting a rich in-domain description.
const COVERAGE_FLOOR = 0.18;
const MIN_ANALYZED_FOR_COVERAGE = 8;
const MIN_RECOGNIZED_IN_SCOPE = 5;

/** The recognized-vocabulary of the offline classifier: every word that can
 *  contribute to a domain, feature or action signal. A token outside this set
 *  is noise the model can't interpret (the analogue of an out-of-vocabulary
 *  n-gram for the trained TF-IDF model). */
const RECOGNIZED_VOCAB: Set<string> = new Set([
  ...Object.values(DOMAINS).flatMap((d) => [...d.strong, ...d.support]),
  ...Object.values(FEATURE_KEYWORDS).flat(),
  ...Object.values(ACTION_KEYWORDS).flat(),
]);

type Decision = "ok" | "low_confidence" | "insufficient_evidence" | "out_of_scope";

function confidenceDecision(
  topProb: number,
  margin: number,
  recognized: number,
  analyzed: number,
): { decision: Decision; confident: boolean } {
  if (analyzed <= 0 || recognized < MIN_RECOGNIZED) {
    return { decision: "insufficient_evidence", confident: false };
  }
  const coverage = analyzed ? recognized / analyzed : 0;
  if (
    analyzed >= MIN_ANALYZED_FOR_COVERAGE &&
    coverage < COVERAGE_FLOOR &&
    recognized < MIN_RECOGNIZED_IN_SCOPE
  ) {
    return { decision: "out_of_scope", confident: false };
  }
  if (topProb >= TOP_PROB_FLOOR || margin >= MARGIN_FLOOR) {
    return { decision: "ok", confident: true };
  }
  return { decision: "low_confidence", confident: false };
}

function clarificationMessage(decision: Decision): string {
  if (decision === "insufficient_evidence") {
    return (
      "I couldn't recognize enough about the kind of app you want to build. " +
      "Try describing what users actually do — for example " +
      '"browse and order food", "track workouts", or "transfer money and pay bills".'
    );
  }
  if (decision === "out_of_scope") {
    return (
      "This looks like it's outside the app types I was trained on. I can " +
      "confidently design food-delivery, fitness, banking, e-commerce, education, " +
      "social, travel and productivity apps. Try rephrasing around one of those, " +
      "or describe the core actions users take so I can map them onto screens I know."
    );
  }
  return (
    "Your description could fit several kinds of app and I'm not confident which one " +
    "you mean. Add a sentence about the main thing users do so I can pick the right screens."
  );
}

export function analyzeLocally(description: string): RequirementAnalysis {
  const tokens = new Set(tokenize(description));

  // ---- weighted app-type classification ----
  const probabilities = classifyDomain(tokens);
  const topWeight = Object.entries(DOMAINS).reduce((best, [label, spec]) => {
    const w = spec.strong.reduce((n, k) => n + (tokens.has(k) ? 3 : 0), 0) +
              spec.support.reduce((n, k) => n + (tokens.has(k) ? 1 : 0), 0);
    return w > best.w ? { label, w } : best;
  }, { label: "productivity", w: 0 });
  const appType = topWeight.w > 0 ? topWeight.label : "productivity";
  const appTypeConfidence = topWeight.w > 0 ? probabilities[0].score : 0.4;

  // ---- features (domain-gated) ----
  const features = Object.entries(FEATURE_KEYWORDS)
    .map(([name, kws]) => {
      const hits = kws.reduce((n, k) => n + (tokens.has(k) ? 1 : 0), 0);
      return { name, confidence: hits ? Math.min(0.6 + 0.15 * (hits - 1), 0.97) : 0, source: "rule" as const };
    })
    .filter((f) => {
      if (f.confidence <= 0) return false;
      const gate = FEATURE_DOMAIN_GATE[f.name];
      return !gate || gate.includes(appType);
    });
  // authentication is offered softly (below the design layer's threshold) so it
  // only becomes real screens when the requirement explicitly asks for it.
  if (!features.find((f) => f.name === "authentication")) {
    features.push({ name: "authentication", confidence: 0.55, source: "rule" });
  }
  features.sort((a, b) => b.confidence - a.confidence);

  // ---- actions ----
  const actions: string[] = [];
  for (const [action, kws] of Object.entries(ACTION_KEYWORDS)) {
    if (kws.some((k) => tokens.has(k))) actions.push(action);
  }
  if (!actions.includes("Login")) actions.unshift("Login");

  // ---- inferred screens (surfaced in the ML insight panel) ----
  const authPresent = (features.find((f) => f.name === "authentication")?.confidence ?? 0) >= 0.6;
  const picked = new Set<ScreenRole>(["splash"]);
  if (authPresent) picked.add("login");
  for (const f of features) (FEATURE_SCREENS[f.name] ?? []).forEach((r) => picked.add(r));
  // domain hints fill in the natural screens for the detected app type
  (APPTYPE_HINTS[appType] ?? []).forEach((r) => picked.add(r));
  if (!picked.has("home") && !picked.has("dashboard")) picked.add("home");
  picked.add("profile");
  // auth screens must not appear without an auth signal
  if (!authPresent) { picked.delete("login"); picked.delete("signup"); }

  const inferredScreens = [...picked]
    .sort((a, b) => SCREEN_ORDER.indexOf(a) - SCREEN_ORDER.indexOf(b))
    .map((role) => ({ role, reason: REASONS[role] ?? "Generated screen." }));

  // ---- confidence / uncertainty decision ----
  // Evidence = how many recognized (interpretable) tokens the input contained.
  // Meaningless input like "qwert" matches nothing, so recognized === 0 and the
  // decision is "insufficient_evidence" — we ask the user to clarify instead of
  // silently keeping the productivity default.
  const analyzed = tokens.size;
  let recognized = 0;
  for (const t of tokens) if (RECOGNIZED_VOCAB.has(t)) recognized++;
  const topProb = probabilities[0]?.score ?? 0;
  const secondProb = probabilities[1]?.score ?? 0;
  const margin = Math.round((topProb - secondProb) * 1000) / 1000;
  const { decision, confident } = confidenceDecision(topProb, margin, recognized, analyzed);
  const needsClarification = !confident;

  // ---- entities (the "things" the app manages) ----
  // Deterministic offline mirror of the backend spaCy extractor. Surfaces the
  // requirement's real subject nouns so the ML insight panel is populated
  // offline AND the generator can relabel generic browse/detail screens.
  const entities = extractEntities(description).map((e) => ({ text: e.text, kind: e.kind }));

  return {
    appType,
    appTypeConfidence,
    appTypeProbabilities: probabilities,
    targetUsers: targetUsers(description),
    purpose: PURPOSE[appType] ?? "Deliver the described experience to users.",
    features,
    actions,
    entities,
    inferredScreens,
    pipeline: {
      preprocessing: "local tokenizer + stemmer (browser)",
      classifier: "weighted keyword scoring (offline fallback — start the backend for the trained ML model)",
      extraction: "domain-gated keyword rules",
    },
    needsClarification,
    clarification: needsClarification ? clarificationMessage(decision) : null,
    classification: {
      decision,
      confident,
      topProbability: topProb,
      margin,
      evidence: {
        recognized,
        analyzed,
        coverage: analyzed ? Math.round((recognized / analyzed) * 1000) / 1000 : 0,
      },
    },
  };
}
