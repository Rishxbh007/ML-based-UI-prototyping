/**
 * MorphHero — Morph's landing hero, as a true two-column composition.
 *
 *   LEFT  · headline + description + requirement composer (normal flow)
 *   RIGHT · the phone, running the PhoneScrollHero animation
 *
 * The animation is the PhoneScrollHero component: scroll-driven 22°→0° rotateX
 * with a 0.94→1 scale and the same `-rect.top / travel` progress calc and
 * reduced-motion behaviour. The phone is in normal document flow (NOT pinned),
 * so it scrolls together with the left column; the only extra motion is the
 * tilt/scale straightening, which resolves over the section's short scroll and
 * then holds.
 *
 * Composition notes:
 *  - The component is dropped into the right grid cell. It reads its own
 *    <section> rect for scroll progress, so it behaves identically in a single
 *    column — the phone straightens and then scrolls away with the page.
 *  - `titleComponent` is null: Morph's headline lives in the LEFT column.
 *  - Neither column is sticky and the grid is `items-center`, so text and phone
 *    stay aligned and move together as you scroll.
 *  - A `NeonOrbs` layer sits behind the hero (this section only) as a soft
 *    orbiting-light background, with a canvas-tinted scrim over it so the
 *    headline and composer stay crisp.
 *
 * The phone screen shows an on-brand abstract violet gradient by default (no
 * people, no network dependency). Drop a clip at `public/hero/phone-film.mp4`
 * and it plays instead; if that file is missing the gradient shows.
 */
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PhoneScrollHero } from "@/components/ui/phone-scroll-hero";
import { NeonOrbs } from "@/components/ui/neon-orbs";
import { AnimatedText } from "@/components/ui/animated-text";
import { RequirementInput } from "./RequirementInput";

/** Optional drop-in film. Put a vertical clip at
 *  `frontend/public/hero/phone-film.mp4` and it plays inside the phone. If the
 *  file is absent, the <video> errors and we reveal the abstract gradient. */
const LOCAL_VIDEO = "/hero/phone-film.mp4";

/** The phone's screen: an abstract, slowly drifting violet gradient (matches
 *  Morph's accent, no people). If a local film exists it plays on top. */
function PhoneScreen() {
  const [videoFailed, setVideoFailed] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#080511]">
      {/* Abstract animated gradient field — decorative, no people. */}
      <div aria-hidden className="absolute inset-0">
        {/* Slowly rotating conic wash — keeps constant, visible motion so the
            screen never reads as a flat colour. */}
        <motion.div
          className="absolute -inset-1/3 blur-2xl"
          style={{
            background:
              "conic-gradient(from 0deg, #4f46e5, #7c3aed, #c026d3, #a21caf, #6d28d9, #4f46e5)",
          }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        />

        {/* Drifting colour blobs — travel across the whole screen and screen-blend
            into bright, shifting highlights. */}
        <motion.div
          className="absolute left-[8%] top-[6%] h-1/2 w-2/3 rounded-full bg-[#8b5cf6] opacity-70 blur-2xl mix-blend-screen"
          animate={reduce ? undefined : { x: [0, 90, -30, 0], y: [0, 70, 130, 0], scale: [1, 1.25, 0.85, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[4%] bottom-[5%] h-1/2 w-2/3 rounded-full bg-[#e879f9] opacity-60 blur-2xl mix-blend-screen"
          animate={reduce ? undefined : { x: [0, -80, 40, 0], y: [0, -80, -30, 0], scale: [1, 1.15, 1.35, 1] }}
          transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-[28%] top-[38%] h-2/5 w-3/5 rounded-full bg-[#6366f1] opacity-60 blur-2xl mix-blend-screen"
          animate={reduce ? undefined : { x: [0, 70, -70, 0], y: [0, -60, 50, 0], scale: [1.1, 0.85, 1.25, 1.1] }}
          transition={{ duration: 23, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Depth + top/bottom fade so it reads like a lit screen. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/55" />
      </div>

      {!videoFailed && (
        <video
          src={LOCAL_VIDEO}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Abstract film playing on the phone screen"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setVideoFailed(true)}
        />
      )}
    </div>
  );
}

export function MorphHero() {
  return (
    <section className="relative overflow-hidden">
      {/* NeonOrbs as the hero background only — soft orbiting indigo light on
          the white canvas. Behind the content (z-0) and non-interactive; a
          light scrim keeps the headline and composer crisp. */}
      <NeonOrbs
        fill
        showContent={false}
        className="z-0 bg-transparent opacity-70 pointer-events-none"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-canvas/70 via-canvas/35 to-canvas/80"
      />

      <div className="relative z-10 mx-auto max-w-content px-6 pt-10 md:pt-14">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
        {/* LEFT · text + composer. In normal flow (no sticky) so it scrolls
            together with the phone on the right — nothing pins or lags. */}
        <div className="min-w-0">
          <div className="lg:pt-16">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-ink-muted">
              Natural language → interactive prototype
            </p>
            <h1 className="sr-only">Turn a sentence into a screen you can tap — a mobile app from plain English</h1>
            <AnimatedText
              text={"Turn a sentence\ninto a screen\nyou can tap."}
              fontSize="clamp(2rem, 6vw, 3.5rem)"
              minWeight={200}
              maxWeight={800}
              className="mt-4 justify-start text-ink"
            />
            <p className="mt-6 max-w-lg text-balance text-lg leading-relaxed text-ink-soft">
              Morph reads a natural-language requirement, understands the app it
              describes, and generates the screens, components and navigation —
              as a real, interactive prototype.
            </p>
            <div className="mt-9 max-w-xl">
              <RequirementInput />
            </div>
          </div>
        </div>

        {/* RIGHT · the phone. It scrolls together with the left column (no pin);
            the component's own modest section height gives the short scroll
            over which the phone straightens. */}
        <div>
          <PhoneScrollHero titleComponent={null}>
            <PhoneScreen />
          </PhoneScrollHero>
        </div>
      </div>
      </div>
    </section>
  );
}

export default MorphHero;
