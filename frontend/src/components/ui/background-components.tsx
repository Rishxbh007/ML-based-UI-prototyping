/**
 * Soft sunny-glow background — a white field lit by a warm yellow radial that
 * blooms from the centre and multiplies into the page. Dependency-free, purely
 * decorative. Mounted as a fixed, pointer-events-none layer behind app content
 * (see DashboardPage) so it stays put while the gallery scrolls.
 */

/** The full-bleed glow field, as supplied. */
export const Component = () => {
  return (
    <div className="min-h-screen w-full relative bg-white">
      {/* Soft Yellow Glow */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle at center, #FFF991 0%, transparent 70%)`,
          opacity: 0.6,
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
};

/**
 * Background-layer wrapper: pins {@link Component} to the viewport behind
 * everything (`fixed inset-0 -z-10`). The parent must establish a stacking
 * context (`isolate`) so the negative z-index stays contained.
 */
export const SunnyGlowBackground = () => {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <Component />
    </div>
  );
};
