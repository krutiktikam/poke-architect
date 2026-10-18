import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { VisualQualityProvider } from '../src/context/VisualQualityContext';
import { VISUAL_QUALITY_STORAGE_KEY } from '../src/context/VisualQuality.utils';
import { VisualQualityToggle } from '../src/components/Header/VisualQualityToggle';
import { HeroBackground } from '../src/components/common/HeroBackground';

describe('HeroBackground & Low-Power gating', () => {
  beforeEach(() => {
    localStorage.clear();
    // Default matchMedia to not matching reduced motion
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('renders canvas slot in high mode and static gradient', async () => {
    localStorage.setItem(VISUAL_QUALITY_STORAGE_KEY, 'high');

    render(
      <VisualQualityProvider>
        <HeroBackground />
      </VisualQualityProvider>
    );

    expect(screen.getByTestId('hero-background')).toBeInTheDocument();
    expect(screen.getByTestId('hero-static-gradient')).toBeInTheDocument();
    const canvasSlot = await screen.findByTestId('hero-canvas-slot');
    expect(canvasSlot).toBeInTheDocument();
  });

  it('unmounts canvas slot in low mode, keeping static gradient', () => {
    localStorage.setItem(VISUAL_QUALITY_STORAGE_KEY, 'low');

    render(
      <VisualQualityProvider>
        <HeroBackground />
      </VisualQualityProvider>
    );

    expect(screen.getByTestId('hero-background')).toBeInTheDocument();
    expect(screen.getByTestId('hero-static-gradient')).toBeInTheDocument();
    expect(screen.queryByTestId('hero-canvas-slot')).not.toBeInTheDocument();
  });

  it('forces low quality in auto mode when prefers-reduced-motion is true', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <VisualQualityProvider>
        <HeroBackground />
      </VisualQualityProvider>
    );

    expect(screen.getByTestId('hero-static-gradient')).toBeInTheDocument();
    expect(screen.queryByTestId('hero-canvas-slot')).not.toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-quality')).toBe('low');
  });

  it('unmounts canvas slot when document becomes hidden', async () => {
    localStorage.setItem(VISUAL_QUALITY_STORAGE_KEY, 'high');

    render(
      <VisualQualityProvider>
        <HeroBackground />
      </VisualQualityProvider>
    );

    expect(await screen.findByTestId('hero-canvas-slot')).toBeInTheDocument();

    // Simulate tab switching / visibilityState change to hidden
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.queryByTestId('hero-canvas-slot')).not.toBeInTheDocument();

    // Simulate tab becoming visible again
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(await screen.findByTestId('hero-canvas-slot')).toBeInTheDocument();
  });

  it('persists quality toggle choice in localStorage', async () => {
    const { getByLabelText, getByText } = render(
      <VisualQualityProvider>
        <VisualQualityToggle />
        <HeroBackground />
      </VisualQualityProvider>
    );

    // Open dropdown
    const toggleBtn = getByLabelText(/Visual quality mode:/i);
    act(() => {
      toggleBtn.click();
    });

    // Select Low Quality
    const lowBtn = getByText('Low Quality');
    act(() => {
      lowBtn.click();
    });

    expect(localStorage.getItem(VISUAL_QUALITY_STORAGE_KEY)).toBe('low');
    expect(screen.queryByTestId('hero-canvas-slot')).not.toBeInTheDocument();
  });
});
