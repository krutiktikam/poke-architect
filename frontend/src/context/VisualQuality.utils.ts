export type QualityMode = 'auto' | 'high' | 'low';
export type ResolvedQuality = 'high' | 'low';

export interface VisualQualityContextType {
  qualityMode: QualityMode;
  resolvedQuality: ResolvedQuality;
  setQualityMode: (mode: QualityMode) => void;
}

export const VISUAL_QUALITY_STORAGE_KEY = 'poke_visual_quality_mode';

export interface EnvDetectParams {
  reducedMotion?: boolean;
  saveData?: boolean;
  deviceMemory?: number;
}

/**
 * Pure function computing resolved quality from mode and environmental heuristics.
 * Evaluates truth table:
 * In auto: low when reducedMotion || saveData || deviceMemory <= 2.
 */
export const computeResolvedQuality = (
  mode: QualityMode,
  env?: EnvDetectParams
): ResolvedQuality => {
  if (mode === 'high') return 'high';
  if (mode === 'low') return 'low';

  const reducedMotion =
    env?.reducedMotion ??
    (typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const connection =
    nav && 'connection' in nav
      ? (nav as unknown as { connection?: { saveData?: boolean } }).connection
      : undefined;

  const saveData = env?.saveData ?? connection?.saveData === true;

  const deviceMemory =
    env?.deviceMemory ??
    (nav && 'deviceMemory' in nav
      ? (nav as unknown as { deviceMemory?: number }).deviceMemory
      : undefined);

  const isLowMemory = typeof deviceMemory === 'number' && deviceMemory <= 2;

  if (reducedMotion || saveData || isLowMemory) {
    return 'low';
  }

  return 'high';
};
