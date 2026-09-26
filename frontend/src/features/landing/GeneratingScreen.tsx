/**
 * GeneratingScreen — the living picture inside the hero phone.
 *
 * A self-contained, dependency-light loop that tells Morph's whole story on a
 * phone screen: a natural-language requirement is typed, understood (domain +
 * confidence), turned into screens, and finally becomes a real, tappable-looking
 * generated app. The "building" phases wear Morph's own violet; the finished
 * app wears its own warm product palette, so the hand-off reads instantly.
 *
 * Motion is transform/opacity only. Honours prefers-reduced-motion by holding
 * the finished app screen with no timers running.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Home, Search, ClipboardList, User, Star, Plus, Check } from "lucide-react";

const REQUIREMENT =
  "A food delivery app to browse restaurants, add dishes to a cart and check out.";

/* Morph brand ink used across the "building" phases. */
const M = {
  ink: "#17161B",
  sub: "#6C6A74",
  faint: "#A2A0A9",
  line: "rgba(23,22,27,0.10)",
  violet: "#5B3DF5",
  violetSoft: "#F2EFFE",
};

/* The generated app's OWN palette — a warm coral product, distinct from Morph. */
const A = {
  ink: "#1C1712",
  sub: "#8B8175",
  line: "rgba(28,23,18,0.09)",
  accent: "#FF5A3C",
  accentSoft: "#FFEBE6",
  chip: "#F5F2EC",
};

const PHASES = [
  { key: "describe", ms: 2100 },
  { key: "understand", ms: 2200 },
  { key: "generate", ms: 1700 },
  { key: "prototype", ms: 4400 },
] as const;

const ease = [0.16, 1, 0.3, 1] as const;

export function GeneratingScreen() {
  const reduced = useReducedMotion();
  // Reduced motion → hold the finished app (index 3), no cycling.
  const [phase, setPhase] = useState(reduced ? 3 : 0);

  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase].ms);
    return () => clearTimeout(id);
  }, [phase, reduced]);

  const key = PHASES[phase].key;

  return (
    <div className="absolute inset-0 select-none" style={{ background: "#FFFFFF", color: M.ink }}>
      {/* status row — clears the camera island, present in every phase */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[0.55rem]"
        style={{ fontSize: 10.5, fontWeight: 600, color: key === "prototype" ? A.ink : M.ink }}
      >
        <span>9:41</span>
        <span
          className="inline-block rounded-[2px]"
          style={{ width: 15, height: 8.5, border: `1.4px solid currentColor`, opacity: 0.85 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease }}
          className="absolute inset-0"
        >
          {key === "describe" && <DescribePhase />}
          {key === "understand" && <UnderstandPhase />}
          {key === "generate" && <GeneratePhase />}
          {key === "prototype" && <PrototypePhase />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── phase 1 · describe ──────────────────────────────────────── */

function useTypewriter(text: string, speed = 30) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return text.slice(0, n);
}

function DescribePhase() {
  const typed = useTypewriter(REQUIREMENT);
  return (
    <div className="flex h-full flex-col px-4 pb-4 pt-9">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: M.violet }} />
          <span className="text-[11px] font-semibold tracking-tight">Morph</span>
        </div>
        <span className="text-[9.5px] font-medium" style={{ color: M.faint }}>
          New prototype
        </span>
      </div>

      <div
        className="mt-5 rounded-2xl p-3.5"
        style={{ border: `1px solid ${M.line}`, boxShadow: "0 8px 24px -14px rgba(23,22,27,0.18)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full" style={{ background: M.violet }} />
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: M.sub }}>
            Requirement
          </span>
        </div>
        <p className="mt-2 text-[12.5px] font-medium leading-snug" style={{ letterSpacing: "-0.01em" }}>
          {typed}
          <motion.span
            aria-hidden
            className="ml-[1px] inline-block align-middle"
            style={{ width: 1.5, height: "1em", background: M.violet }}
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
          />
        </p>
      </div>

      <div className="mt-auto flex items-center gap-1.5" style={{ color: M.faint }}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1 w-1 rounded-full bg-current"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }}
          />
        ))}
        <span className="ml-1 text-[10px]">Reading your words</span>
      </div>
    </div>
  );
}

/* ── phase 2 · understand ────────────────────────────────────── */

const FEATURES = ["Auth", "Browse", "Search", "Cart", "Checkout"];

function UnderstandPhase() {
  return (
    <div className="flex h-full flex-col px-4 pb-4 pt-9">
      <div className="flex items-center gap-1.5">
        <motion.span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: M.violet }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: M.sub }}>
          Understanding
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="mt-4 flex items-center gap-2"
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ background: M.violetSoft, color: M.violet }}
        >
          <Check size={13} strokeWidth={2.6} />
        </span>
        <span className="text-[17px] font-semibold tracking-tight">Food delivery</span>
      </motion.div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[9.5px] font-medium" style={{ color: M.sub }}>
            Confidence
          </span>
          <span className="font-mono text-[11px] font-semibold" style={{ color: M.violet }}>
            94%
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: M.violetSoft }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: M.violet }}
            initial={{ width: "0%" }}
            animate={{ width: "94%" }}
            transition={{ duration: 0.9, ease, delay: 0.15 }}
          />
        </div>
      </div>

      <div className="mt-5">
        <span className="text-[9.5px] font-medium" style={{ color: M.sub }}>
          Features detected
        </span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FEATURES.map((f, i) => (
            <motion.span
              key={f}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease, delay: 0.25 + i * 0.09 }}
              className="rounded-full px-2 py-[3px] text-[10px] font-medium"
              style={{ border: `1px solid ${M.line}`, color: M.ink }}
            >
              {f}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── phase 3 · generate ──────────────────────────────────────── */

function GeneratePhase() {
  return (
    <div className="flex h-full flex-col px-4 pb-4 pt-9">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: M.violet }} />
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: M.sub }}>
          Generating screens
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.88, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.34, ease, delay: i * 0.09 }}
            className="aspect-[9/16] rounded-lg p-1.5"
            style={{ border: `1px solid ${M.line}`, background: "#FBFAF8" }}
          >
            <div className="h-2 w-full rounded-[3px]" style={{ background: i === 0 ? M.violet : M.line }} />
            <div className="mt-1 h-1 w-3/4 rounded-full" style={{ background: M.line }} />
            <div className="mt-1 h-1 w-1/2 rounded-full" style={{ background: M.line }} />
            <div className="mt-1.5 h-4 w-full rounded" style={{ background: "rgba(91,61,245,0.07)" }} />
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="mt-auto font-mono text-[10px]"
        style={{ color: M.sub }}
      >
        6 screens · fully navigable
      </motion.p>
    </div>
  );
}

/* ── phase 4 · prototype (the finished, living app) ──────────── */

const CATEGORIES = ["Pizza", "Sushi", "Salads", "Bowls"];
const RESTAURANTS = [
  { name: "Nonna's Kitchen", meta: "20–30 min", rating: "4.8", g: "linear-gradient(135deg,#FFB199,#FF5A3C)" },
  { name: "Green & Grain", meta: "15–25 min", rating: "4.9", g: "linear-gradient(135deg,#B7E4C7,#40916C)" },
];

function PrototypePhase() {
  return (
    <div className="absolute inset-0" style={{ background: "#FFFFFF", color: A.ink }}>
      <div className="flex h-full flex-col px-4 pt-9">
        {/* header */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-[9px] font-medium" style={{ color: A.sub }}>
              DELIVER TO
            </p>
            <p className="text-[12.5px] font-semibold tracking-tight">Home · 2 min</p>
          </div>
          <span className="h-7 w-7 rounded-full" style={{ background: A.accentSoft, border: `1px solid ${A.line}` }} />
        </motion.div>

        {/* search */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease, delay: 0.06 }}
          className="mt-3 flex items-center gap-1.5 rounded-full px-3 py-2"
          style={{ background: A.chip }}
        >
          <Search size={13} style={{ color: A.sub }} />
          <span className="text-[11px]" style={{ color: A.sub }}>
            Search dishes
          </span>
        </motion.div>

        {/* categories */}
        <div className="mt-3 flex gap-1.5 overflow-hidden">
          {CATEGORIES.map((c, i) => (
            <motion.span
              key={c}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease, delay: 0.1 + i * 0.05 }}
              className="whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-medium"
              style={
                i === 0
                  ? { background: A.accent, color: "#fff" }
                  : { background: A.chip, color: A.ink }
              }
            >
              {c}
            </motion.span>
          ))}
        </div>

        <p className="mt-4 text-[11.5px] font-semibold tracking-tight">Popular near you</p>

        {/* restaurant cards */}
        <div className="mt-2 flex flex-col gap-2">
          {RESTAURANTS.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.16 + i * 0.1 }}
              className="flex items-center gap-2.5 rounded-2xl p-2"
              style={{ border: `1px solid ${A.line}` }}
            >
              <span className="h-12 w-12 shrink-0 rounded-xl" style={{ background: r.g }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold tracking-tight">{r.name}</p>
                <div className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: A.sub }}>
                  <Star size={10} style={{ color: A.accent, fill: A.accent }} />
                  <span className="font-medium" style={{ color: A.ink }}>
                    {r.rating}
                  </span>
                  <span>· {r.meta} · $$</span>
                </div>
              </div>
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ background: A.accent, color: "#fff" }}
              >
                <Plus size={13} strokeWidth={2.6} />
              </span>
            </motion.div>
          ))}
        </div>

        {/* bottom nav */}
        <div
          className="mt-auto -mx-4 flex items-center justify-around px-4 pb-3 pt-2"
          style={{ borderTop: `1px solid ${A.line}` }}
        >
          {[
            { I: Home, on: true },
            { I: Search, on: false },
            { I: ClipboardList, on: false },
            { I: User, on: false },
          ].map(({ I, on }, i) => (
            <I key={i} size={17} style={{ color: on ? A.accent : A.sub }} strokeWidth={on ? 2.4 : 1.9} />
          ))}
        </div>
      </div>
    </div>
  );
}


