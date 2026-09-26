import { Link } from "react-router-dom";

/**
 * The Morph wordmark — a compact near-black mark and the name in Inter.
 * The only colour is a single accent dot: the "shift" the product is named
 * for. No gradient, no glow.
 */
export function Wordmark({ to = "/", size = "md" }: { to?: string; size?: "sm" | "md" }) {
  const glyph = size === "sm" ? 22 : 25;
  const text = size === "sm" ? "text-[15px]" : "text-[16.5px]";
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label="Morph home">
      <span
        className="relative inline-flex items-center justify-center rounded-[7px] bg-ink text-white"
        style={{ width: glyph, height: glyph }}
      >
        <span className="font-semibold leading-none" style={{ fontSize: glyph * 0.54, letterSpacing: "-0.03em" }}>
          M
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 h-[7px] w-[7px] rounded-full bg-morph-500 ring-[2.5px] ring-canvas transition-transform duration-300 ease-out-expo group-hover:scale-110" />
      </span>
      <span className={`font-semibold tracking-[-0.02em] text-ink ${text}`}>Morph</span>
    </Link>
  );
}
