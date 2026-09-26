import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * LiquidButton — glass CTA, ported from the Nereus project's LiquidGlassButton.
 * ═══════════════════════════════════════════════════════════════════════════
 * Ported faithfully, with two changes forced by Morph's actual stack:
 *
 *  1. `class-variance-authority` (cva) is NOT a dependency here and installs are
 *     blocked, so the variant table is inlined as a plain `liquidButtonVariants()`
 *     helper that returns the same class strings cva produced.
 *  2. Nereus tokens (`signal` / `signal-text`) don't exist in Morph. The focus
 *     ring maps to white and the hover-warm on the light `default` variant is
 *     dropped; the `onDark` variant (white label) is what the neon band uses.
 *
 * Everything else — the rim (stacked inset shadows that sell glass thickness),
 * the lens (`backdrop-filter: url(#container-glass)`), and the SVG displacement
 * filter — is unchanged. The distortion is a Chromium capability; other engines
 * fall back to the shadow rim alone, which still reads as deliberate glass.
 */

type Variant = "default" | "onDark" | "subtle";
type Size = "sm" | "default" | "lg" | "xl";

const liquidBase =
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold outline-none transition-[color,transform,box-shadow] disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-white/40 [&_svg]:pointer-events-none [&_svg]:shrink-0";

const liquidVariants: Record<Variant, string> = {
  default: "bg-transparent text-ink duration-300 hover:scale-[1.03] hover:text-morph-500",
  onDark: "bg-transparent text-white duration-300 hover:scale-[1.03]",
  subtle: "bg-transparent text-ink-soft duration-300 hover:text-ink",
};

const liquidSizes: Record<Size, string> = {
  sm: "h-9 gap-1.5 px-5 text-xs",
  default: "h-11 px-6",
  lg: "h-12 px-8",
  xl: "h-14 px-10 text-base",
};

export function liquidButtonVariants(opts?: { variant?: Variant; size?: Size; className?: string }) {
  const { variant = "default", size = "lg", className } = opts ?? {};
  return cn(liquidBase, liquidVariants[variant], liquidSizes[size], className);
}

export interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  function LiquidButton({ className, variant, size, children, ...props }, ref) {
    return (
      <button ref={ref} className={liquidButtonVariants({ variant, size, className })} {...props}>
        <LiquidSurface>{children}</LiquidSurface>
      </button>
    );
  },
);

/**
 * The glass itself: rim, lens, label and filter. Exported so a real anchor
 * (`<Link>`) can be a liquid button — it takes `liquidButtonVariants()` for its
 * classes and renders `<LiquidSurface>` for its contents. Must only ever be used
 * inside an element carrying `liquidButtonVariants()` (which supplies position,
 * radius and the focus ring the two absolute layers depend on).
 */
export function LiquidSurface({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {/* The rim: stacked inset shadows are what sell the thickness of glass. */}
      <span
        aria-hidden
        className="absolute left-0 top-0 z-0 h-full w-full rounded-full shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)] transition-all"
      />
      {/* The lens: refracts whatever sits behind the button. */}
      <span
        aria-hidden
        className="absolute left-0 top-0 isolate -z-10 h-full w-full overflow-hidden rounded-full"
        style={{ backdropFilter: 'url("#container-glass")' }}
      />
      <span className="pointer-events-none z-10 inline-flex items-center gap-2">{children}</span>
      <GlassFilter />
    </>
  );
}

/** The displacement filter. Self-contained; duplicate ids resolve to the first. */
export function GlassFilter() {
  return (
    <svg aria-hidden className="hidden">
      <defs>
        <filter id="container-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves={1} seed={1} result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="70" xChannelSelector="R" yChannelSelector="B" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}
