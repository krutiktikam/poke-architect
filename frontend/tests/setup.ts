import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll, vi, expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';
import { server } from './msw/server';
import axios from 'axios';

expect.extend(toHaveNoViolations);

// Ensure axios uses fetch in tests so MSW intercepts all requests
axios.defaults.adapter = 'fetch';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
    if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.clear === 'function') {
      sessionStorage.clear();
    }
  } catch {
    // Ignore storage clear errors in test env
  }
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

// Polyfill window.matchMedia for JSDOM
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock localStorage for reliable tests
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
  Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true, configurable: true });

  // Polyfill ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
