import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

/**
 * RippleBackground — an interactive field that emits concentric ripples on
 * click, plus gentle ambient ripples on a timer. Ported from the supplied
 * 21st.dev component and adapted to Morph's stack:
 *
 *  - `<style jsx>` is Next-only; this is a Vite app. The `@keyframes ripple`
 *    and `.animate-ripple` utility now live in `src/styles/index.css` (same
 *    pattern as AnimatedText / GradientBlob / NeonOrbs), with a
 *    prefers-reduced-motion off-switch.
 *  - Ripple colours remapped from the source's purple/blue/pink to Morph's
 *    violet accent family (morph / indigo / fuchsia) so it sits on the
 *    white-first canvas.
 *  - The source pinned each ripple's top-left at the cursor (via `inset-0` on a
 *    zero-size parent), so circles grew down-right instead of concentrically —
 *    clearly not the intent for a "ripple". Each circle now centres on the
 *    click point with a `-translate-x-1/2 -translate-y-1/2`.
 *  - `className` overrides the default full-screen light gradient so the field
 *    can back any section. Because Morph's `cn` is plain clsx (not
 *    tailwind-merge), the default height/background is supplied ONLY when no
 *    `className` is passed (avoids a class collision).
 */
interface Ripple {
  x: number;
  y: number;
  id: number;
  timestamp: number;
}

export const RippleBackground = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  const spawn = (x: number, y: number) => {
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { x, y, id, timestamp: Date.now() }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const createRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    spawn(e.clientX - rect.left, e.clientY - rect.top);
  };

  // Ambient ripples so the field is alive before any interaction.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      spawn(Math.random() * rect.width, Math.random() * rect.height);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={createRipple}
      className={cn(
        "relative w-full cursor-pointer overflow-hidden",
        className ?? "min-h-screen bg-gradient-to-br from-morph-50 via-white to-fuchsia-50",
      )}
    >
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="pointer-events-none absolute"
          style={{ left: ripple.x, top: ripple.y }}
        >
          <div className="animate-ripple absolute rounded-full border-2 border-morph-400/30" />
          <div
            className="animate-ripple absolute rounded-full border-2 border-indigo-400/20"
            style={{ animationDelay: "0.12s" }}
          />
          <div
            className="animate-ripple absolute rounded-full border-2 border-fuchsia-400/15"
            style={{ animationDelay: "0.24s" }}
          />
        </div>
      ))}

      <div className="relative z-10">
        {children ?? (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h2 className="mb-4 text-4xl font-bold text-ink">Interactive Ripple Background</h2>
              <p className="text-ink-muted">Click anywhere to create ripples</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RippleBackground;
