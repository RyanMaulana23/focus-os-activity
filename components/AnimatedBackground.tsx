/**
 * AnimatedBackground — Fixed aurora + orb + grid layers.
 * Pure CSS animations, zero JS overhead.
 */
export function AnimatedBackground() {
  return (
    <>
      {/* Aurora + orbs (CSS ::before / ::after on .animated-bg) */}
      <div className="animated-bg" aria-hidden="true" />
      {/* Dot grid */}
      <div className="bg-grid"     aria-hidden="true" />
      {/* Vignette */}
      <div className="bg-vignette" aria-hidden="true" />
    </>
  );
}
