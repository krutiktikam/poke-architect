import React from 'react';

/**
 * Default lazy canvas slot placeholder for HeroBackground.
 * Serves as the mount point for future WebGL/3D canvases.
 */
export const HeroCanvasSlot: React.FC = () => {
  return (
    <div
      data-testid="hero-canvas-slot"
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <div className="w-full h-full opacity-60 mix-blend-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-purple-500/10 to-transparent animate-pulse-glow" />
    </div>
  );
};

export default HeroCanvasSlot;
