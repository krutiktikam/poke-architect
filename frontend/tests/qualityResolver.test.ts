import { describe, it, expect } from 'vitest';
import { computeResolvedQuality } from '../src/context/VisualQuality.utils';

describe('Quality resolver truth table', () => {
  describe("mode = 'high'", () => {
    it('always resolves to high regardless of environment', () => {
      expect(computeResolvedQuality('high', { reducedMotion: true, saveData: true, deviceMemory: 1 })).toBe('high');
      expect(computeResolvedQuality('high', { reducedMotion: false, saveData: false, deviceMemory: 8 })).toBe('high');
    });
  });

  describe("mode = 'low'", () => {
    it('always resolves to low regardless of environment', () => {
      expect(computeResolvedQuality('low', { reducedMotion: false, saveData: false, deviceMemory: 8 })).toBe('low');
      expect(computeResolvedQuality('low', { reducedMotion: true, saveData: true, deviceMemory: 1 })).toBe('low');
    });
  });

  describe("mode = 'auto' truth table", () => {
    it('resolves to high when full capabilities and no restrictions', () => {
      expect(
        computeResolvedQuality('auto', {
          reducedMotion: false,
          saveData: false,
          deviceMemory: 8,
        })
      ).toBe('high');

      expect(
        computeResolvedQuality('auto', {
          reducedMotion: false,
          saveData: false,
          deviceMemory: 4,
        })
      ).toBe('high');
    });

    it('resolves to low when prefers-reduced-motion is enabled', () => {
      expect(
        computeResolvedQuality('auto', {
          reducedMotion: true,
          saveData: false,
          deviceMemory: 8,
        })
      ).toBe('low');
    });

    it('resolves to low when saveData is true', () => {
      expect(
        computeResolvedQuality('auto', {
          reducedMotion: false,
          saveData: true,
          deviceMemory: 8,
        })
      ).toBe('low');
    });

    it('resolves to low when deviceMemory <= 2', () => {
      expect(
        computeResolvedQuality('auto', {
          reducedMotion: false,
          saveData: false,
          deviceMemory: 2,
        })
      ).toBe('low');

      expect(
        computeResolvedQuality('auto', {
          reducedMotion: false,
          saveData: false,
          deviceMemory: 1,
        })
      ).toBe('low');

      expect(
        computeResolvedQuality('auto', {
          reducedMotion: false,
          saveData: false,
          deviceMemory: 0.5,
        })
      ).toBe('low');
    });

    it('resolves to low when multiple flags are active', () => {
      expect(
        computeResolvedQuality('auto', {
          reducedMotion: true,
          saveData: true,
          deviceMemory: 1,
        })
      ).toBe('low');
    });
  });
});
