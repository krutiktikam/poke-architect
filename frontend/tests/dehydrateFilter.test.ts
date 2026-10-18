import { describe, it, expect } from 'vitest';
import { dehydrateOptions } from '../src/api/queryClient';

describe('Persister dehydrateOptions filter', () => {
  it('returns true only for successful encyclopedia queries', () => {
    const validEncyclopediaQuery = {
      queryKey: ['encyclopedia', 'encounters', 'v1.0.0', 25],
      state: { status: 'success' },
    };
    expect(dehydrateOptions.shouldDehydrateQuery(validEncyclopediaQuery)).toBe(true);

    const pendingEncyclopediaQuery = {
      queryKey: ['encyclopedia', 'encounters', 'v1.0.0', 25],
      state: { status: 'pending' },
    };
    expect(dehydrateOptions.shouldDehydrateQuery(pendingEncyclopediaQuery)).toBe(false);

    const errorEncyclopediaQuery = {
      queryKey: ['encyclopedia', 'encounters', 'v1.0.0', 25],
      state: { status: 'error' },
    };
    expect(dehydrateOptions.shouldDehydrateQuery(errorEncyclopediaQuery)).toBe(false);
  });

  it('rejects non-encyclopedia queries from persistence', () => {
    const teamsQuery = {
      queryKey: ['teams', 'user-123'],
      state: { status: 'success' },
    };
    expect(dehydrateOptions.shouldDehydrateQuery(teamsQuery)).toBe(false);

    const authQuery = {
      queryKey: ['auth', 'me'],
      state: { status: 'success' },
    };
    expect(dehydrateOptions.shouldDehydrateQuery(authQuery)).toBe(false);

    const versionsQuery = {
      queryKey: ['versions'],
      state: { status: 'success' },
    };
    expect(dehydrateOptions.shouldDehydrateQuery(versionsQuery)).toBe(false);
  });
});
