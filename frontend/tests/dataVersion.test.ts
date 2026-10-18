import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDataVersion,
  setDataVersion,
  appendDataVersion,
  fetchDataVersion,
  buildEncyclopediaKey,
  formatUrlWithDataVersion,
} from '../src/api/dataVersion';
import { queryClient, ENCYCLOPEDIA_KEY_PREFIX } from '../src/api/queryClient';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server';

describe('DataVersion utilities & invalidation', () => {
  beforeEach(() => {
    localStorage.clear();
    setDataVersion('v1.0.0');
    queryClient.clear();
  });

  it('correctly appends ?dv= parameter to URLs', () => {
    const urlWithoutQuery = 'http://localhost:8000/api/pokemon/25/encounters';
    const withDv = appendDataVersion(urlWithoutQuery, '20261016_v1');
    expect(withDv).toBe('http://localhost:8000/api/pokemon/25/encounters?dv=20261016_v1');

    const urlWithQuery = 'http://localhost:8000/api/locations?limit=20';
    const withDv2 = appendDataVersion(urlWithQuery, '20261016_v1');
    expect(withDv2).toBe('http://localhost:8000/api/locations?limit=20&dv=20261016_v1');
  });

  it('builds encyclopedia query key including data version', () => {
    setDataVersion('v2.5.0');
    const key = buildEncyclopediaKey('encounters', 25);
    expect(key).toEqual([ENCYCLOPEDIA_KEY_PREFIX, 'encounters', 'v2.5.0', 25]);
  });

  it('drops persisted encyclopedia queries when data_version changes', () => {
    // Populate queryClient cache with encyclopedia and non-encyclopedia queries
    queryClient.setQueryData([ENCYCLOPEDIA_KEY_PREFIX, 'locations', 'v1.0.0'], [{ id: 1 }]);
    queryClient.setQueryData(['teams'], [{ id: 'team-1' }]);

    expect(queryClient.getQueryData([ENCYCLOPEDIA_KEY_PREFIX, 'locations', 'v1.0.0'])).toBeDefined();
    expect(queryClient.getQueryData(['teams'])).toBeDefined();

    // Changing data version must drop encyclopedia queries
    setDataVersion('v2.0.0');

    expect(getDataVersion()).toBe('v2.0.0');
    expect(queryClient.getQueryData([ENCYCLOPEDIA_KEY_PREFIX, 'locations', 'v1.0.0'])).toBeUndefined();
    // Non-encyclopedia queries remain unaffected
    expect(queryClient.getQueryData(['teams'])).toBeDefined();
  });

  it('fetches data-version with cache: no-cache and updates when changed', async () => {
    let capturedCacheMode: string | undefined;

    server.use(
      http.get('*/api/meta/data-version', ({ request }) => {
        capturedCacheMode = request.headers.get('cache-control') || undefined;
        return HttpResponse.json({
          data_version: 'v3.0.0',
          updated_at: '2026-10-17T12:00:00Z',
        });
      })
    );

    const version = await fetchDataVersion();
    expect(version).toBe('v3.0.0');
    expect(getDataVersion()).toBe('v3.0.0');
    expect(capturedCacheMode).toBe('no-cache');
  });

  it('appends ?dv= only to encyclopedia endpoints and never to /auth, /teams, /health, or analysis', () => {
    // Encyclopedia endpoints MUST have ?dv= appended
    expect(formatUrlWithDataVersion('/api/pokemon/25/encounters')).toContain('dv=');
    expect(formatUrlWithDataVersion('/api/pokemon/133/evolutions')).toContain('dv=');
    expect(formatUrlWithDataVersion('/api/locations')).toContain('dv=');
    expect(formatUrlWithDataVersion('/api/items/pockets')).toContain('dv=');
    expect(formatUrlWithDataVersion('/api/berries')).toContain('dv=');
    expect(formatUrlWithDataVersion('/api/versions')).toContain('dv=');
    expect(formatUrlWithDataVersion('/api/regions')).toContain('dv=');
    expect(formatUrlWithDataVersion('/api/moves')).toContain('dv=');
    expect(formatUrlWithDataVersion('/api/abilities')).toContain('dv=');
    expect(formatUrlWithDataVersion('/api/natures')).toContain('dv=');

    // Non-encyclopedia endpoints MUST NEVER have ?dv= appended
    expect(formatUrlWithDataVersion('/api/health')).not.toContain('dv=');
    expect(formatUrlWithDataVersion('/api/auth/login')).not.toContain('dv=');
    expect(formatUrlWithDataVersion('/api/auth/me')).not.toContain('dv=');
    expect(formatUrlWithDataVersion('/auth/google/callback')).not.toContain('dv=');
    expect(formatUrlWithDataVersion('/api/teams')).not.toContain('dv=');
    expect(formatUrlWithDataVersion('/api/teams/123')).not.toContain('dv=');
    expect(formatUrlWithDataVersion('/api/team-analysis')).not.toContain('dv=');
    expect(formatUrlWithDataVersion('/api/compare-teams')).not.toContain('dv=');
    expect(formatUrlWithDataVersion('/api/analytics/global')).not.toContain('dv=');
    expect(formatUrlWithDataVersion('/api/meta/data-version')).not.toContain('dv=');
  });
});
