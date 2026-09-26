/**
 * TubesBackground — the original "Neon Flow" effect from the source prompt.
 *
 * This is the real component: it loads `threejs-components@0.0.19`'s
 * `tubes1.min.js` at runtime (in the browser) and renders the genuine WebGL
 * neon-tubes-follow-the-cursor effect, with click-to-randomise.
 *
 * Two codebase adaptations were required (the effect itself is unchanged):
 *  - Removed the prompt's unused `framer-motion` / `useState` imports — this
 *    project is TS-strict (`noUnusedLocals`), so unused imports fail the build.
 *  - Typed the CDN app instead of `any`. The external URL module has no types,
 *    so the dynamic import is `@ts-ignore`d (tsc) + `@vite-ignore`d (bundler),
 *    exactly as the source intends.
 *
 * NOTE: the CDN renderer paints an opaque background and can't be made
 * transparent from outside, so this is meant to fill a DARK container (a hero
 * or a contained showcase panel), with content layered on top — not used as a
 * transparent full-page overlay.
 */
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const randomColors = (count: number) =>
  new Array(count)
    .fill(0)
    .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"));

interface TubesApp {
  tubes: {
    setColors: (colors: string[]) => void;
    setLightsColors: (colors: string[]) => void;
  };
  destroy?: () => void;
  dispose?: () => void;
}

type TubesFactory = (
  canvas: HTMLCanvasElement,
  opts: { tubes: { colors: string[]; lights: { intensity: number; colors: string[] } } },
) => TubesApp;

interface TubesBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  enableClickInteraction?: boolean;
}

export function TubesBackground({
  children,
  className,
  enableClickInteraction = true,
}: TubesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tubesRef = useRef<TubesApp | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!canvasRef.current) return;
      try {
        // The exact effect requested, from the source's CDN build. Loaded at
        // runtime in the browser; tsc + Vite skip it via the ignore comments.
        // @ts-ignore -- external URL module, no type declarations
        const mod = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js");
        if (!mounted || !canvasRef.current) return;

        const TubesCursor = (mod as { default: TubesFactory }).default;
        tubesRef.current = TubesCursor(canvasRef.current, {
          tubes: {
            colors: ["#f967fb", "#53bc28", "#6958d5"],
            lights: {
              intensity: 200,
              colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"],
            },
          },
        });
      } catch (error) {
        console.error("Failed to load TubesCursor:", error);
      }
    };

    init();

    return () => {
      mounted = false;
      tubesRef.current?.destroy?.();
      tubesRef.current?.dispose?.();
      tubesRef.current = null;
    };
  }, []);

  const handleClick = () => {
    if (!enableClickInteraction || !tubesRef.current) return;
    tubesRef.current.tubes.setColors(randomColors(3));
    tubesRef.current.tubes.setLightsColors(randomColors(4));
  };

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden bg-black", className)}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        style={{ touchAction: "none" }}
      />
      {/* Content Overlay */}
      <div className="relative z-10 h-full w-full pointer-events-none">{children}</div>
    </div>
  );
}

export default TubesBackground;
