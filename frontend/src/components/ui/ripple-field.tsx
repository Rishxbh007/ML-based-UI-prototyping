import { useEffect, useRef, useState } from "react";

/**
 * RippleField — an APP-WIDE ripple layer. Unlike the section-scoped
 * `RippleBackground`, this is a single fixed, full-viewport overlay mounted once
 * at the app root, so a click *anywhere* in the app sends out concentric
 * ripples.
 *
 *  - `position: fixed; inset: 0` + a very high z-index means it sits above all
 *    content, so the rings stay visible on Morph's white canvas even over
 *    opaque cards, the phone frame, panels, etc.
 *  - `pointer-events: none` on the layer means it NEVER blocks clicks — buttons,
 *    links and inputs all work normally; we only *listen* on `window` for the
 *    click and draw a ring at the pointer.
 *  - Because the layer is fixed, `e.clientX/clientY` (viewport coords) map
 *    directly to `left/top` — no rect maths.
 *  - Colours use the morph/fuchsia/indigo accent family at higher opacity than
 *    the old section variant so the rings actually read on white.
 *  - The `@keyframes ripple` / `.animate-ripple` utility lives in
 *    `src/styles/index.css` (Vite has no styled-jsx) and is reduced-motion
 *    guarded there.
 */
interface Ripple {
  x: number;
  y: number;
  id: number;
}

export const RippleField = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const spawn = (e: MouseEvent) => {
      const id = idRef.current++;
      setRipples((prev) => [...prev, { x: e.clientX, y: e.clientY, id }]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 1200);
    };
    window.addEventListener("click", spawn);
    return () => window.removeEventListener("click", spawn);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden>
      {ripples.map((ripple) => (
        <div key={ripple.id} className="absolute" style={{ left: ripple.x, top: ripple.y }}>
          <div className="animate-ripple absolute rounded-full border-2 border-morph-500/55" />
          <div
            className="animate-ripple absolute rounded-full border-2 border-fuchsia-500/40"
            style={{ animationDelay: "0.12s" }}
          />
          <div
            className="animate-ripple absolute rounded-full border-2 border-indigo-500/30"
            style={{ animationDelay: "0.24s" }}
          />
        </div>
      ))}
    </div>
  );
};

export default RippleField;
