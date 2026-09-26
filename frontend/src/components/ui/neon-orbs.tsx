"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/* ── types ───────────────────────────────────────────────────── */

export interface NeonOrbsProps {
  /** Extra classes on the root — e.g. to override sizing/positioning. */
  className?: string;
  /**
   * Show the centred "BEYOND LIMITS" headline. Default `true` (the standalone
   * demo). Pass `false` when the orbs are used purely as a background behind
   * other content.
   */
  showContent?: boolean;
  /**
   * Fill the nearest positioned ancestor (`absolute inset-0`) instead of taking
   * a full screen height — for use as a section background. When `false` the
   * component behaves like the original: a full-viewport, centred stage.
   */
  fill?: boolean;
}

/* ── component ───────────────────────────────────────────────── */

/**
 * Animated field of soft neon "orbs" with slowly orbiting light beams.
 *
 * The visual CSS (`.orb-light`, `.beam-*`, the spin keyframes) lives in the
 * global stylesheet (`src/styles/index.css`) rather than in a `<style jsx>`
 * block, because this is a Vite app — styled-jsx is not available here.
 */
export function NeonOrbs({
  className,
  showContent = true,
  fill = false,
}: NeonOrbsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden transition-colors duration-500",
        fill
          ? "absolute inset-0 h-full w-full"
          : "relative h-screen w-full bg-slate-100 dark:bg-[#050a18]",
        className,
      )}
    >
      {/* Top-left orb */}
      <div
        className={`absolute transition-all duration-1000 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"
        }`}
        style={{ top: "-40%", left: "-20%", width: "80vw", height: "80vw", maxWidth: "800px", maxHeight: "800px" }}
      >
        <div className="w-full h-full rounded-full relative orb-light transition-all duration-500">
          <div className="beam-container beam-spin-8">
            <div className="beam-light" />
          </div>
        </div>
      </div>

      {/* Bottom-center orb */}
      <div
        className={`absolute transition-all duration-1000 ease-out delay-300 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
        style={{ bottom: "-50%", left: "50%", transform: "translateX(-50%)", width: "100vw", height: "100vw", maxWidth: "1000px", maxHeight: "1000px" }}
      >
        <div className="w-full h-full rounded-full relative orb-light transition-all duration-500">
          <div className="beam-container beam-spin-10-reverse">
            <div className="beam-light" />
          </div>
        </div>
      </div>

      {/* Top-right orb */}
      <div
        className={`absolute transition-all duration-1000 ease-out delay-500 ${
          mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
        }`}
        style={{ top: "-30%", right: "-25%", width: "70vw", height: "70vw", maxWidth: "700px", maxHeight: "700px" }}
      >
        <div className="w-full h-full rounded-full relative orb-light transition-all duration-500">
          <div className="beam-container beam-spin-6">
            <div className="beam-light" />
          </div>
        </div>
      </div>

      {/* Bottom-right orb */}
      <div
        className={`absolute transition-all duration-1000 ease-out delay-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
        style={{ bottom: "-35%", right: "-15%", width: "75vw", height: "75vw", maxWidth: "750px", maxHeight: "750px" }}
      >
        <div className="w-full h-full rounded-full relative orb-light transition-all duration-500">
          <div className="beam-container beam-spin-7-reverse">
            <div className="beam-light" />
          </div>
        </div>
      </div>

      {/* Center text — optional. */}
      {showContent && (
        <div className="relative z-10 text-center text-indigo-900 dark:text-white transition-colors duration-500">
          <h1
            className={`text-4xl md:text-7xl font-extralight tracking-[0.2em] mb-4 transition-all duration-1000 ease-out ${
              mounted ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-8 blur-sm"
            }`}
            style={{ transitionDelay: "500ms" }}
          >
            {"BEYOND LIMITS".split("").map((char, i) => (
              <span
                key={i}
                className={`inline-block transition-all duration-500 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${800 + i * 50}ms` }}
              >
                {char === " " ? " " : char}
              </span>
            ))}
          </h1>
          <p
            className={`text-lg md:text-xl font-light tracking-widest text-indigo-600/60 dark:text-white/60 transition-all duration-1000 ease-out ${
              mounted ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
            }`}
            style={{ transitionDelay: "1500ms" }}
          >
            THE FUTURE IS NOW
          </p>
        </div>
      )}
    </div>
  );
}

export default NeonOrbs;
