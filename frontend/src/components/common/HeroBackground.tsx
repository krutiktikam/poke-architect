import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useVisualQuality } from '../../context/useVisualQuality';

/**
 * How to plug in a 3D/WebGL Canvas:
 * ----------------------------------------------------
 * 1. Install your 3D library (e.g., `three`, `@react-three/fiber`, or `@shadergradient/react`).
 * 2. Create a canvas component, e.g. `const MyShaderCanvas = lazy(() => import('./MyShaderCanvas'))`.
 * 3. Pass it to <HeroBackground CanvasComponent={MyShaderCanvas} />.
 * 4. The HeroBackground handles automatic unmounting on low-power mode, battery saver,
 *    reduced motion preferences, and when the document/tab is hidden.
 */
export interface HeroBackgroundProps {
  /** Optional custom canvas component to lazy-load and mount in high-quality mode */
  CanvasComponent?: React.ComponentType;
  className?: string;
  children?: React.ReactNode;
}

const DefaultLazyCanvas = lazy(() => import('./HeroCanvasSlot'));

export const HeroBackground: React.FC<HeroBackgroundProps> = ({
  CanvasComponent,
  className = '',
  children,
}) => {
  const { resolvedQuality } = useVisualQuality();
  const [isVisible, setIsVisible] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState !== 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const shouldRenderCanvas = resolvedQuality === 'high' && isVisible;
  const ActiveCanvas = CanvasComponent || DefaultLazyCanvas;

  return (
    <div
      data-testid="hero-background"
      data-quality={resolvedQuality}
      className={`fixed inset-0 overflow-hidden pointer-events-none -z-10 ${className}`}
      aria-hidden="true"
    >
      {/* Static CSS Gradient Fallback (Always rendered or active in low quality) */}
      <div
        data-testid="hero-static-gradient"
        className="absolute inset-0 bg-gradient-to-b from-[#0b0e17] via-[#0f1322] to-[#0b0e17]"
      >
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] bg-blue-600/5 blur-[100px] rounded-full" />
      </div>

      {/* Lazy-Loaded Canvas Slot: ONLY mounted when resolvedQuality is high AND tab is visible */}
      {shouldRenderCanvas && (
        <Suspense fallback={null}>
          <ActiveCanvas />
        </Suspense>
      )}

      {children}
    </div>
  );
};

export default HeroBackground;
