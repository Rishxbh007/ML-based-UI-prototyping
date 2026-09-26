/** Deterministic-ish id helpers for schema nodes. */
let _counter = 0;

/** Monotonic id with a prefix, unique within a generation pass. */
export function uid(prefix = "n"): string {
  _counter += 1;
  return `${prefix}_${_counter.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Stable slug from a human label. */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
