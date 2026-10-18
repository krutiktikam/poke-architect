import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VersionProvider } from '../src/context/VersionContext';
import { useVersion } from '../src/context/useVersion';
import { VERSION_STORAGE_KEY } from '../src/context/VersionContext.types';

describe('VersionContext persistence and validation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <VersionProvider>{children}</VersionProvider>
    </QueryClientProvider>
  );

  it('preserves valid stored version ID', async () => {
    // 1 is a valid version (Red in versions.json)
    localStorage.setItem(VERSION_STORAGE_KEY, '1');

    const { result } = renderHook(() => useVersion(), { wrapper });

    await waitFor(() => {
      expect(result.current.versions.length).toBeGreaterThan(0);
    });

    expect(result.current.selectedVersionId).toBe(1);
    expect(result.current.selectedVersion?.identifier).toBe('red');
  });

  it('resets invalid stored version ID to null', async () => {
    // 999999 does not exist in versions.json
    localStorage.setItem(VERSION_STORAGE_KEY, '999999');

    const { result } = renderHook(() => useVersion(), { wrapper });

    await waitFor(() => {
      expect(result.current.versions.length).toBeGreaterThan(0);
    });

    // Should have validated against the fetched list and reset to null
    await waitFor(() => {
      expect(result.current.selectedVersionId).toBeNull();
    });

    expect(localStorage.getItem(VERSION_STORAGE_KEY)).toBeNull();
  });

  it('updates localStorage when a new version is selected', async () => {
    const { result } = renderHook(() => useVersion(), { wrapper });

    await waitFor(() => {
      expect(result.current.versions.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.setSelectedVersionId(2); // Blue
    });

    expect(result.current.selectedVersionId).toBe(2);
    expect(localStorage.getItem(VERSION_STORAGE_KEY)).toBe('2');

    act(() => {
      result.current.setSelectedVersionId(null);
    });

    expect(result.current.selectedVersionId).toBeNull();
    expect(localStorage.getItem(VERSION_STORAGE_KEY)).toBeNull();
  });
});
