import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * AnimatedText — per-letter "breathing" weight animation on a variable font.
 * Ported from the supplied 21st.dev component, adapted to Morph's stack:
 *
 *  - `<style jsx>` is Next-only; this is a Vite app. The `@keyframes breath`
 *    now lives in `src/styles/index.css` (same pattern as NeonOrbs), driven by
 *    per-letter `--wght-min` / `--wght-max` custom properties so a single
 *    global keyframe serves every instance with its own weight range.
 *  - Requires the variable Inter axis — `index.html` loads `Inter:wght@100..900`.
 *  - `fontSize` also accepts a CSS length string (e.g. a `clamp(...)`) so the
 *    headline can be responsive; a bare number is still treated as px.
 *  - `className` is forwarded to the wrapper so callers control alignment/colour
 *    (letters inherit `currentColor`), defaulting to centered as in the source.
 */
interface AnimatedTextProps {
  text: string;
  fontSize?: number | string;
  minWeight?: number;
  maxWeight?: number;
  animationDuration?: number;
  delayMultiplier?: number;
  className?: string;
}

export function AnimatedText({
  text,
  fontSize = 150,
  minWeight = 0,
  maxWeight = 840,
  animationDuration = 1.5,
  delayMultiplier = 0.25,
  className = "justify-center",
}: AnimatedTextProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const spans = containerRef.current.querySelectorAll("span");
    const numLetters = spans.length;
    spans.forEach((span, i) => {
      const mappedIndex = i - numLetters / 2;
      span.style.animationDelay = mappedIndex * delayMultiplier + "s";
    });
  }, [text, delayMultiplier]);

  const characters = text.split("").map((char, index) => {
    // Honour explicit line breaks so callers can fix the line composition.
    // This matters because the animated `wght` changes each glyph's advance
    // width, so relying on auto-wrap makes words jitter between lines.
    if (char === "\n") return <br key={index} />;
    const style: React.CSSProperties = {
      animation: `breath ${animationDuration}s alternate cubic-bezier(0.37, 0, 0.63, 1) infinite`,
      animationFillMode: "both",
      fontVariationSettings: `"wght" ${minWeight}`,
    };
    // CSS custom properties consumed by the `breath` keyframe in index.css.
    const vars = style as Record<string, string | number>;
    vars["--wght-min"] = minWeight;
    vars["--wght-max"] = maxWeight;
    return (
      <span key={index} aria-hidden="true" style={style}>
        {char === " " ? " " : char}
      </span>
    );
  });

  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      <p
        ref={containerRef}
        aria-label={text}
        className="m-0 min-w-0 max-w-full break-words font-sans"
        style={{
          fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize,
          fontFeatureSettings: '"wght"',
        }}
      >
        {characters}
      </p>
    </div>
  );
}
