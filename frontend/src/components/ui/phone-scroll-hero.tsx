"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

/* ── types ───────────────────────────────────────────────────── */

export interface PhoneScrollHeroProps {
  /** Headline block. Sits *behind* the phone, so the phone can climb over it. */
  titleComponent: React.ReactNode;
  /** Rendered inside the phone screen. */
  children?: React.ReactNode;
  /**
   * @deprecated No longer used. The phone is pinned in place rather than
   * climbing over the title, so there is no overlap distance to tune.
   */
  overlap?: number;
  /** Backward tilt of the phone at the start of the scroll, in deg. Default `22`. */
  tilt?: number;
  className?: string;
}

/* ── helpers ─────────────────────────────────────────────────── */

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/* ── pieces ──────────────────────────────────────────────────── */

/** Device chassis. Every surface is a shadcn token, so the frame follows the
 *  host theme; only the camera island is a fixed colour (see below). */
function PhoneFrame({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[13rem] sm:w-[15rem] md:w-[17rem]">
      {/* side buttons */}
      <span
        aria-hidden
        className="absolute -left-[2px] top-[16%] h-7 w-[3px] rounded-l-sm bg-muted-foreground/30"
      />
      <span
        aria-hidden
        className="absolute -left-[2px] top-[24%] h-11 w-[3px] rounded-l-sm bg-muted-foreground/30"
      />
      <span
        aria-hidden
        className="absolute -right-[2px] top-[22%] h-14 w-[3px] rounded-r-sm bg-muted-foreground/30"
      />
      <div className="aspect-[9/19.5] rounded-[2.5rem] border border-border bg-muted p-[0.35rem] shadow-[0_10px_20px_rgba(0,0,0,0.18),0_40px_60px_-20px_rgba(0,0,0,0.35)]">
        <div className="relative h-full w-full overflow-hidden rounded-[2.2rem] bg-background ring-1 ring-inset ring-border/70">
          {/* Camera island. Deliberately *not* themed — it is a hole in the
              glass, so it stays black in light and dark, exactly as on a real
              device showing a dark app. */}
          <div
            aria-hidden
            className="absolute left-1/2 top-2 z-10 h-[1.1rem] w-[4.25rem] -translate-x-1/2 rounded-full bg-black"
          />
          {children ?? (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground/70">
                Replace screen
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── component ───────────────────────────────────────────────── */

/**
 * A hero whose phone mockup starts tilted back on the X axis and straightens
 * to flat within a short scroll, then scrolls away with the rest of the page.
 *
 * The phone lives in normal document flow (it is NOT sticky/pinned), so it
 * moves together with everything else as the page scrolls — the only extra
 * motion is the tilt/scale straightening, which resolves over the section's
 * short scroll and then holds. This avoids the "phone stays put while the page
 * moves" feel of a pinned stage.
 *
 * - Pass the headline as `titleComponent`; it renders *behind* the phone.
 * - Pass the screen content as `children` (a `<video>`, an `<img>`, or JSX).
 * - Tune the scroll length (and thus how gradually the phone straightens) with
 *   `className="h-[…]"`; keep it only modestly above 100vh so the phone does
 *   not travel far.
 *
 * Honours `prefers-reduced-motion`: the phone renders flat and static, and no
 * scroll listener is attached.
 */
export function PhoneScrollHero({
  titleComponent,
  children,
  tilt = 22,
  className,
}: PhoneScrollHeroProps) {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = React.useRef<HTMLElement>(null);

  // Scroll progress (0 → 1) read from the section's *own* window. motion's
  // `useScroll` always binds to the global `window`, so it goes dead when the
  // component is portaled into another document (the docs preview iframe).
  // `ownerDocument.defaultView` is correct in the top page and the frame alike.
  const progress = useMotionValue(0);

  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion) return;
    const el = sectionRef.current;
    if (!el) return;
    const win = el.ownerDocument.defaultView ?? window;
    let raf = 0;
    // Mirrors motion's default ["start start", "end end"] offset: 0 when the
    // section top meets the viewport top, 1 when its bottom meets the bottom.
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const travel = Math.max(1, rect.height - win.innerHeight);
      progress.set(Math.min(1, Math.max(0, -rect.top / travel)));
    };
    const onScroll = () => {
      if (!raf) raf = win.requestAnimationFrame(update);
    };
    update();
    win.addEventListener("scroll", onScroll, { passive: true });
    win.addEventListener("resize", onScroll);
    return () => {
      win.removeEventListener("scroll", onScroll);
      win.removeEventListener("resize", onScroll);
      if (raf) win.cancelAnimationFrame(raf);
    };
  }, [prefersReducedMotion, progress]);

  // Rotate/scale in place — no independent vertical translation — so the phone
  // scrolls *together* with the rest of the page and only straightens as it
  // goes. The tilt resolves across most of the section's (short) scroll and
  // then holds (useTransform clamps at the ends), so there is no separate
  // "phone moves, then page moves" motion.
  const COMPLETE = 0.8;
  const rotateX = useTransform(progress, [0, COMPLETE], [tilt, 0]);
  const scale = useTransform(progress, [0, COMPLETE], [0.94, 1]);

  // Reduced motion: no tilt — the phone just sits upright.
  const still = Boolean(prefersReducedMotion);

  return (
    <section
      ref={sectionRef}
      aria-label="Hero"
      className={cn(
        // Normal document flow (NOT sticky/pinned): the phone lives inline and
        // scrolls together with the page. The section is only modestly taller
        // than the viewport, giving a short scroll over which the tilt resolves
        // — so the phone straightens as you scroll and then simply scrolls away
        // with everything else. overflow-hidden keeps the tilted phone from
        // spilling sideways; it is fine here because the section is not a
        // sticky container.
        "relative flex h-[112vh] w-full items-center justify-center overflow-hidden p-2 md:h-[116vh] md:p-8",
        className,
      )}
    >
      <div className="w-full" style={{ perspective: "1200px" }}>
        <div className="relative z-0 mx-auto max-w-5xl px-4 text-center">
          {titleComponent}
        </div>

        <motion.div
          style={{
            rotateX: still ? 0 : rotateX,
            scale: still ? 1 : scale,
          }}
          className="relative z-10 -mt-6 md:-mt-12"
        >
          <PhoneFrame>{children}</PhoneFrame>
        </motion.div>
      </div>
    </section>
  );
}

export default PhoneScrollHero;
