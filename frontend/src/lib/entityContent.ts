/**
 * Entity-driven content (offline, deterministic).
 *
 * The classifier picks a DOMAIN and the deterministic engine picks a fixed set
 * of screen ROLES; both are intentionally generic. This layer adds the missing
 * semantic step: it reads the *entities* the requirement actually talks about
 * (the "things" the app manages) and uses them to relabel the otherwise generic
 * browse/detail screens, so a "team lunch" requirement doesn't render as a stock
 * restaurant template.
 *
 * It is a pure, side-effect-free mirror of the backend spaCy entity extractor
 * (ml/pipeline/entities.py), reduced to what runs deterministically in the
 * browser: noun-candidate counting with a light verb-object heuristic. No domain
 * names are hardcoded — the subject is derived entirely from the user's own
 * words — and it never overrides a screen whose subject the domain template
 * already names correctly (guarded by the domain-vocabulary gate below).
 */
export interface ExtractedEntity {
  text: string; // singularized head noun, lowercase
  kind: string; // coarse type hint or "concept"
  confidence: number;
}

// Nouns about the app itself, not domain entities (mirrors backend _META_NOUNS)
// plus ordinary English function words, so only real subject nouns survive.
const STOPWORDS = new Set<string>([
  "app", "application", "user", "users", "customer", "customers", "people", "person",
  "feature", "features", "screen", "screens", "page", "pages", "button", "buttons",
  "thing", "things", "way", "ways", "system", "platform", "software", "service",
  "someone", "anyone", "everyone", "one", "lot", "kind", "type", "example", "stuff",
  "time", "times", "day", "days", "week", "month", "year", "place", "places", "part",
  "the", "a", "an", "and", "or", "but", "so", "to", "of", "for", "with", "without", "in",
  "on", "at", "by", "from", "into", "about", "as", "is", "are", "be", "been", "being",
  "it", "its", "them", "they", "this", "that", "these", "those", "him", "her", "his",
  "their", "our", "your", "my", "me", "we", "you", "he", "she", "who", "which",
  "want", "wants", "need", "needs", "can", "should", "would", "will", "just", "also",
  "where", "when", "what", "how", "why", "then", "than", "too", "very", "more", "most",
  "each", "every", "some", "any", "all", "other", "another", "such", "own", "same",
  // adjectives / adverbs / participles that read as descriptors, never subjects
  "previous", "shared", "combined", "individual", "various", "several", "overall",
  "entire", "whole", "daily", "weekly", "monthly", "automatic", "current", "recent",
  "total", "main", "final", "new", "old", "next", "last", "first", "second",
]);

// Clearly-verb tokens that must not be treated as entities. Ambiguous words that
// are also common domain nouns (order, book, post, review, message, note) are
// deliberately NOT listed so they can surface as subjects; the domain-vocabulary
// gate later filters out any that the resolved domain already owns.
const VERBS = new Set<string>([
  "create", "invite", "split", "build", "make", "let", "help", "allow", "enable", "set",
  "get", "use", "see", "show", "add", "join", "manage", "choose", "pick", "select",
  "browse", "find", "discover", "explore", "view", "send", "share", "follow", "watch",
  "listen", "play", "pay", "buy", "sell", "reserve", "register", "login", "signin",
  "signup", "tap", "click", "swipe", "open", "close", "start", "stop", "update", "edit",
  "delete", "remove", "save", "upload", "download", "enter", "confirm", "cancel",
  // feature/action verbs that read as capabilities, never as browse subjects
  "search", "track", "filter", "sort", "monitor", "checkout", "collect", "reorder",
  "rate", "compete", "log", "plan",
]);

// Tokens after which the next word is very likely a noun head (verb object, or
// the head of a determiner/preposition phrase). Used only as a soft boost — the
// browser has no dependency parser, so this approximates the backend's
// "object of a verb" signal cheaply and deterministically.
const PRECEDERS = new Set<string>([
  ...VERBS,
  "a", "an", "the", "your", "my", "our", "their", "this", "that", "each", "every",
  "of", "for", "to", "with", "into", "about", "on", "per",
]);

// Light noun -> coarse kind map (mirrors backend _KIND_HINTS, plus common
// team/collaboration actors so people-centric apps read correctly).
const KIND_HINTS: Record<string, string> = {
  doctor: "actor", driver: "actor", seller: "actor", buyer: "actor", teacher: "actor",
  student: "actor", host: "actor", trainer: "actor", creator: "actor", friend: "actor",
  coworker: "actor", colleague: "actor", teammate: "actor", member: "actor",
  employee: "actor", guest: "actor", attendee: "actor", participant: "actor",
  client: "actor", patient: "actor", contact: "actor",
  appointment: "event", meeting: "event", deadline: "event", reminder: "event",
  order: "transaction", payment: "transaction", transaction: "transaction",
  transfer: "transaction", booking: "transaction", bill: "transaction",
  message: "message", chat: "message",
  course: "content", lesson: "content", video: "content", post: "content",
  workout: "content", recipe: "content", article: "content", playlist: "content",
  product: "item", item: "item", restaurant: "item", dish: "item", meal: "item",
  hotel: "item", flight: "item", trip: "item", account: "item", task: "item",
  note: "item", goal: "item", habit: "item", group: "item", room: "item", table: "item",
};

// Which kinds read most naturally as a browsable collection (people/items/
// content), so when several foreign subjects tie we surface the list-like one.
const KIND_PRIORITY: Record<string, number> = {
  actor: 0, item: 1, content: 2, event: 3, transaction: 4, message: 5,
};

function singularize(w: string): string {
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (/(ses|xes|zes|ches|shes)$/.test(w)) return w.slice(0, -2);
  // strip a plural "s" only when it isn't part of a non-plural ending
  // (-ss "class", -us "status", -is "analysis", -ous "previous", -ics "metrics")
  if (w.endsWith("s") && !/(ss|us|is|ous|ics)$/.test(w) && w.length > 3) return w.slice(0, -1);
  return w;
}

function pluralize(w: string): string {
  if (/(s|x|z|ch|sh)$/.test(w)) return w + "es";
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + "ies";
  return w + "s";
}

function titleCase(w: string): string {
  return w.replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * Extract domain entities from a raw requirement, deterministically. Counts
 * candidate nouns (dropping meta/function words and obvious verbs), applies a
 * small boost when a noun follows a verb/determiner/preposition (a cheap proxy
 * for "object of a verb", which the backend derives from real dependency
 * parsing), and returns the strongest, singularized, in confidence order.
 */
export function extractEntities(description: string): ExtractedEntity[] {
  const words = description.toLowerCase().match(/[a-z][a-z'-]*[a-z]/g) ?? [];
  const counts = new Map<string, number>();
  const boosted = new Set<string>();
  const firstSeen = new Map<string, number>();

  for (let i = 0; i < words.length; i++) {
    // strip surrounding punctuation, the possessive "'s", and any stray apostrophes
    // ("everyone's" -> "everyone", which is then dropped as a meta/stopword)
    const raw = words[i]
      .replace(/^[-']+|[-']+$/g, "")
      .replace(/'s?$/, "")
      .replace(/'/g, "");
    if (raw.length < 3 || STOPWORDS.has(raw) || VERBS.has(raw)) continue;
    const noun = singularize(raw);
    if (noun.length < 3 || STOPWORDS.has(noun)) continue;
    counts.set(noun, (counts.get(noun) ?? 0) + 1);
    if (!firstSeen.has(noun)) firstSeen.set(noun, i);
    const prev = i > 0 ? words[i - 1].replace(/^[-']+|[-']+$/g, "") : "";
    if (PRECEDERS.has(prev)) boosted.add(noun);
  }

  if (counts.size === 0) return [];
  const max = Math.max(...counts.values());
  const entities: ExtractedEntity[] = [];
  for (const [noun, c] of counts) {
    const conf = 0.5 + 0.3 * (c / max) + (boosted.has(noun) ? 0.15 : 0);
    entities.push({
      text: noun,
      kind: KIND_HINTS[noun] ?? "concept",
      confidence: Math.round(Math.min(conf, 0.97) * 1000) / 1000,
    });
  }
  entities.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return (firstSeen.get(a.text) ?? 0) - (firstSeen.get(b.text) ?? 0);
  });
  return entities.slice(0, 12);
}

function normalize(w: string): string {
  return singularize(w.toLowerCase());
}

/** Is this entity already part of the resolved domain's own vocabulary? If so,
 *  the domain template already names its screens for that subject and we must
 *  not override them (prevents e.g. renaming a banking "Transactions" list). */
function isDomainSubject(entityText: string, markers: Set<string>): boolean {
  const ne = normalize(entityText);
  for (const m of markers) {
    const nm = normalize(m);
    if (nm === ne || ne.startsWith(nm) || nm.startsWith(ne)) return true;
  }
  return false;
}

export interface EntitySubject {
  singular: string;
  plural: string;
  kind: string;
}

/**
 * Choose the single strongest subject the requirement introduces that the
 * domain template does NOT already account for. Returns null when every strong
 * entity is part of the domain's vocabulary (so the stock names are correct) or
 * when there is no confident entity at all — in both cases the caller keeps the
 * deterministic domain/default names.
 */
export function deriveSubject(
  entities: Array<{ text: string; kind: string }>,
  markers: Set<string>,
): EntitySubject | null {
  const foreign = entities.filter((e) => e.text.length >= 3 && !isDomainSubject(e.text, markers));
  if (foreign.length === 0) return null;
  // Preserve incoming (confidence) order, but prefer collection-like kinds
  // (people/items/content) which read naturally as a browse list.
  const ranked = foreign
    .map((e, i) => ({ e, i, p: KIND_PRIORITY[e.kind] ?? 9 }))
    .sort((a, b) => (a.p !== b.p ? a.p - b.p : a.i - b.i));
  const chosen = ranked[0].e;
  return { singular: titleCase(chosen.text), plural: titleCase(pluralize(chosen.text)), kind: chosen.kind };
}

// Neutral, diverse sample names for actor-subject browse lists (no real people).
// Used ONLY offline, and ONLY when the requirement's subject is a person/actor —
// so a "Coworkers" screen shows plausible people instead of the domain library's
// stock food/product cards. Kept small and generic; carries no domain meaning.
const PEOPLE_SAMPLE = ["Alex Morgan", "Priya Sharma", "Sam Rivera", "Jordan Lee", "Maya Chen", "Diego Torres"];

/**
 * Build a small browse list of sample instances for an ACTOR subject. Returns
 * neutral person rows labelled with the subject (e.g. subtitle "Coworker").
 * Deterministic and side-effect-free; the caller decides when to use it (offline
 * + actor kind only), so non-actor subjects keep the rich domain sample data.
 */
export function subjectListItems(
  subject: EntitySubject,
): Array<{ id: string; title: string; subtitle: string }> {
  return PEOPLE_SAMPLE.map((name, i) => ({
    id: `subj_${i}`,
    title: name,
    subtitle: subject.singular,
  }));
}

// Words in a template screen name that don't, on their own, prove the name fits
// the requirement (generic labels + article/filler words).
const NAME_FILLER = new Set<string>([
  "your", "the", "a", "an", "my", "our", "new", "all", "now",
  "browse", "details", "detail", "screen", "home", "search", "explore",
]);

/**
 * Is a template screen name (e.g. "Restaurants", "Track Order") actually
 * supported by the words of the requirement? Used as the safety gate for
 * relabeling: we only replace a domain-chosen name when the requirement never
 * mentions it — that is exactly when the template made a domain assumption the
 * user's words don't back up (a "food-delivery" app that never says
 * "restaurant"). If any meaningful word of the name appears in the description,
 * the name is grounded and must be kept, so we never rename a correctly-fitting
 * screen (e.g. a shop that really does say "products").
 */
export function nameIsGrounded(name: string, description: string): boolean {
  const desc = new Set((description.toLowerCase().match(/[a-z]+/g) ?? []).map(normalize));
  for (const w of name.toLowerCase().match(/[a-z]+/g) ?? []) {
    if (w.length < 3 || NAME_FILLER.has(w)) continue;
    if (desc.has(normalize(w))) return true;
  }
  return false;
}
