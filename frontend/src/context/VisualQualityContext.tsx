import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  VISUAL_QUALITY_STORAGE_KEY,
  computeResolvedQuality,
  type QualityMode,
  type ResolvedQuality,
} from './VisualQuality.utils';
import { VisualQualityContextInstance } from './VisualQualityContextInstance';

export const VisualQualityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [qualityMode, setQualityModeState] = useState<QualityMode>(() => {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(VISUAL_QUALITY_STORAGE_KEY) : null;
      if (stored === 'high' || stored === 'low' || stored === 'auto') {
        return stored;
      }
    } catch {
      // LocalStorage unavailable
    }
    return 'auto';
  });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  const resolvedQuality = useMemo<ResolvedQuality>(() => {
    return computeResolvedQuality(qualityMode, { reducedMotion: prefersReducedMotion });
  }, [qualityMode, prefersReducedMotion]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-quality', resolvedQuality);
    }
  }, [resolvedQuality]);

  const setQualityMode = useCallback((mode: QualityMode) => {
    setQualityModeState(mode);
    try {
      localStorage.setItem(VISUAL_QUALITY_STORAGE_KEY, mode);
    } catch {
      // Ignore storage error
    }
  }, []);

  const value = useMemo(
    () => ({ qualityMode, resolvedQuality, setQualityMode }),
    [qualityMode, resolvedQuality, setQualityMode]
  );

  return (
    <VisualQualityContextInstance.Provider value={value}>
      {children}
    </VisualQualityContextInstance.Provider>
  );
};

export default VisualQualityProvider;
