/**
 * DomainConstellation — the landing's second movement.
 *
 * No boxes, no connector lines. Morph's classifier weighs one requirement
 * against all eleven domains it knows. The winner (real `analysis.appType`)
 * blazes at the centre; the other ten drift around it like pale stars, each a
 * white point of light whose size tracks its real score. The whole field is
 * mouse-reactive — nodes parallax toward the cursor at different depths and
 * brighten on hover — so it reads as a living, three-dimensional starfield.
 */
import { useMemo, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { buildDemoProjects } from "@/data/demos";

const LABELS: Record<string, string> = {
  "food-delivery": "Food delivery",
  fitness: "Fitness",
  banking: "Banking",
  ecommerce: "E-commerce",
  education: "Education",
  social: "Social",
  media: "Media",
  travel: "Travel",
  healthcare: "Healthcare",
  booking: "Booking",
  productivity: "Productivity",
};

// Hand-scattered rest positions (percent), kept clear of the centre where the
// winner + its label + confidence pill sit. Keyed by domain id.
const POS: Record<string, { x: number; y: number }> = {
  booking: { x: 50, y: 13 },
  travel: { x: 24, y: 24 },
  fitness: { x: 74, y: 20 },
  media: { x: 15, y: 45 },
  productivity: { x: 85, y: 40 },
  healthcare: { x: 20, y: 74 },
  banking: { x: 84, y: 70 },
  social: { x: 40, y: 84 },
  ecommerce: { x: 68, y: 66 },
  education: { x: 60, y: 86 },
};

type Node = {
  id: string;
  label: string;
  pos: { x: number; y: number };
  intensity: number;
  size: number;
  depth: number;
  dx: number;
  dy: number;
  dur: number;
  delay: number;
};

export function DomainConstellation() {
  const project = useMemo(() => buildDemoProjects()[0], []);
  const a = project.prototype.analysis;

  const winner = a?.appType ?? "food-delivery";
  const confidence = a ? Math.round(a.appTypeConfidence * 100) : null;

  const others = useMemo<Node[]>(() => {
    const scores = new Map(
      (a?.appTypeProbabilities ?? []).map((p) => [p.label, p.score]),
    );
    const ids = Object.keys(POS).filter((id) => id !== winner);
    const max = Math.max(0.001, ...ids.map((id) => scores.get(id) ?? 0));
    return ids.map((id, i) => {
      const score = scores.get(id) ?? 0;
      const sign = i % 2 === 0 ? 1 : -1;
      const intensity = 0.42 + 0.58 * (score / max);
      return {
        id,
        label: LABELS[id] ?? id,
        pos: POS[id],
        intensity,
        size: 4 + intensity * 7,
        depth: 0.5 + (i % 3) * 0.25, // parallax layer: bigger = "closer"
        dx: (11 + (i % 3) * 6) * sign,
        dy: (9 + ((i + 1) % 4) * 5) * (i % 3 === 0 ? -1 : 1),
        dur: 9 + (i % 5) * 1.4,
        delay: i * 0.4,
      };
    });
  }, [a, winner]);

  // Pointer parallax. Normalised -1..1 from the field centre, spring-smoothed.
  const wrapRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 55, damping: 18, mass: 0.6 });
  const smy = useSpring(my, { stiffness: 55, damping: 18, mass: 0.6 });

  const onMove = (e: React.MouseEvent) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  // Winner drifts only faintly with the cursor so it stays the anchor.
  const wtx = useTransform(smx, (v) => v * 10);
  const wty = useTransform(smy, (v) => v * 10);

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative mx-auto h-[22rem] w-full max-w-xl md:h-[27rem]"
    >
      {/* Soft bloom behind the winner. */}
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          x: wtx,
          y: wty,
          width: 200,
          height: 200,
          marginLeft: -100,
          marginTop: -100,
          background:
            "radial-gradient(circle, rgba(240,171,252,0.42) 0%, rgba(124,58,237,0.16) 45%, transparent 70%)",
          filter: "blur(10px)",
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Drifting domains — pale stars, parallaxing to the cursor. */}
      {others.map((n) => (
        <DomainNode key={n.id} n={n} mx={smx} my={smy} />
      ))}

      {/* The winner — the blazing core. */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{ transform: "translate(-50%, -50%)" }}
      >
        <motion.div style={{ x: wtx, y: wty }}>
          <motion.div
            className="flex flex-col items-center gap-3"
            animate={{ x: [0, 5, -4, 0], y: [0, -5, 4, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.span
              className="block rounded-full bg-white"
              style={{ width: 22, height: 22 }}
              animate={{
                boxShadow: [
                  "0 0 22px 6px rgba(240,171,252,0.7)",
                  "0 0 48px 16px rgba(240,171,252,0.95)",
                  "0 0 22px 6px rgba(240,171,252,0.7)",
                ],
              }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="flex flex-col items-center gap-2">
              <span
                className="whitespace-nowrap font-display text-2xl font-semibold tracking-tight text-white md:text-[1.7rem]"
                style={{ textShadow: "0 2px 20px rgba(13,6,32,0.95)" }}
              >
                {LABELS[winner] ?? winner}
              </span>
              {confidence !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_8px_2px_rgba(240,171,252,0.8)]" />
                  <span className="font-mono text-xs text-white/85">{confidence}%</span>
                  <span className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/45">
                    match
                  </span>
                </span>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * A single drifting domain star. Its own idle wander (framer keyframes) is
 * nested inside a parallax layer driven by the shared cursor motion values, so
 * the two transforms never collide.
 */
function DomainNode({
  n,
  mx,
  my,
}: {
  n: Node;
  mx: MotionValue<number>;
  my: MotionValue<number>;
}) {
  const tx = useTransform(mx, (v) => v * n.depth * 26);
  const ty = useTransform(my, (v) => v * n.depth * 26);
  const glow = 6 + n.intensity * 14;
  const spread = 1 + n.intensity * 3;

  return (
    <div
      className="absolute"
      style={{ left: `${n.pos.x}%`, top: `${n.pos.y}%`, transform: "translate(-50%, -50%)" }}
    >
      <motion.div style={{ x: tx, y: ty }}>
        <motion.div
          className="flex cursor-default flex-col items-center gap-1.5"
          animate={{ x: [0, n.dx, -n.dx * 0.6, 0], y: [0, -n.dy, n.dy * 0.7, 0] }}
          transition={{ duration: n.dur, repeat: Infinity, ease: "easeInOut", delay: n.delay }}
          whileHover={{ scale: 1.32 }}
        >
          <motion.span
            className="block rounded-full bg-white"
            style={{
              width: n.size,
              height: n.size,
              boxShadow: `0 0 ${glow}px ${spread}px rgba(255,255,255,${0.35 + n.intensity * 0.45})`,
            }}
            animate={{ opacity: [n.intensity * 0.65, 1, n.intensity * 0.65], scale: [1, 1.18, 1] }}
            transition={{ duration: 2.6 + n.delay, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="whitespace-nowrap text-xs font-medium text-white/65 transition-colors md:text-[0.8rem]"
            style={{ textShadow: "0 1px 8px rgba(13,6,32,0.9)" }}
          >
            {n.label}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
