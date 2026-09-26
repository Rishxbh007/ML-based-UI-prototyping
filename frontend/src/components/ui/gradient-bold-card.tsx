import { cn } from "@/lib/utils";

/**
 * GradientBlob / GradientBlobCard
 * Ported from the supplied 21st.dev "gradient-bold-card" component and adapted
 * to Morph's stack:
 *
 *  - The source inlined an `@keyframes blob` + `.animate-blob` inside a `<style>`
 *    tag rendered per instance. This is a Vite app and we may mount several
 *    blobs, so the keyframe/utility now live once in `src/styles/index.css`
 *    (same pattern as AnimatedText / NeonOrbs).
 *  - `dark:` variants are inert in Morph (the app never sets `class="dark"`),
 *    so the dark branches were dropped.
 *  - The reusable `GradientBlob` layer is factored out so the animated blob can
 *    sit behind arbitrary content (e.g. the requirement composer) rather than
 *    only inside the fixed demo card. It defaults to a Morph-harmonised violet
 *    gradient; pass `gradientClassName` for any other palette (e.g. the source's
 *    bold `from-pink-500 via-red-500 to-yellow-500`).
 */

interface GradientBlobProps {
  /** Position / size / opacity of the blob layer (Tailwind classes). */
  className?: string;
  /** Gradient colours for the blob. Defaults to a bold Morph-violet blend. */
  gradientClassName?: string;
}

/** The drifting, blurred gradient blob on its own — drop it inside any
 *  `relative` (ideally `overflow-hidden`) container as a decorative layer. */
export function GradientBlob({ className, gradientClassName }: GradientBlobProps) {
  return (
    <div
      aria-hidden
      className={cn(
        // left/top-1/2 is the anchor; the `blob` keyframe animates transform.
        "pointer-events-none absolute left-1/2 top-1/2 h-[150px] w-[150px] rounded-full blur-[12px] animate-blob",
        gradientClassName ?? "bg-gradient-to-r from-morph-500 via-fuchsia-500 to-indigo-400",
        className,
      )}
    />
  );
}

/** A soft animated aura sized to hug a card/box that sits on top of it. Render
 *  it as a preceding sibling inside a `relative` frame, before the opaque card
 *  (the card, painted later with its own background, hides the aura's interior
 *  so only the blurred halo bleeds out around the edges). */
export function GradientBlobAura({
  className,
  gradientClassName,
  blobClassName,
}: {
  className?: string;
  gradientClassName?: string;
  blobClassName?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -inset-3 overflow-hidden rounded-[inherit] blur-2xl",
        className,
      )}
    >
      <GradientBlob
        gradientClassName={gradientClassName}
        className={cn("h-[130%] w-[75%] opacity-70", blobClassName)}
      />
    </div>
  );
}

/** The faithful standalone card from the source (bold pink→red→yellow blob
 *  drifting behind a frosted white glass panel). */
export default function GradientBlobCard() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="relative flex h-[250px] w-[200px] flex-col items-center justify-center overflow-hidden rounded-[14px] shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]">
        {/* Frosted glass panel */}
        <div className="absolute left-[5px] top-[5px] z-10 h-[240px] w-[190px] rounded-[10px] bg-white/95 outline outline-2 outline-white backdrop-blur-[24px]" />

        {/* Animated gradient blob */}
        <GradientBlob
          className="z-0 opacity-100"
          gradientClassName="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500"
        />
      </div>
    </div>
  );
}
