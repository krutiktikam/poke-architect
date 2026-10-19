import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { heldItemsQueryOptions } from '../src/api/queries';
import { API_BASE_URL } from '../src/config';

describe('Held Items Query & API client', () => {
  it('heldItemsQueryOptions constructs the correct URL with holdable=true, sort=name, and limit=300', async () => {
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: [
        { id: 211, name: 'Leftovers', is_holdable: true },
        { id: 247, name: 'Life Orb', is_holdable: true },
      ],
    });

    const options = heldItemsQueryOptions(300);
    expect(options.queryKey).toContain('items');
    expect(options.queryKey).toContain('holdable');
    expect(options.queryKey).toContain(300);

    // Call queryFn
    const queryFn = options.queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(getSpy).toHaveBeenCalledTimes(1);
    const calledUrl = getSpy.mock.calls[0][0];

    // Assert that the URL includes the required parameters
    expect(calledUrl).toContain('/api/items?holdable=true&sort=name&limit=300');
    // Ensure it never generates /api/api/...
    expect(calledUrl).not.toContain('/api/api');

    expect(result).toEqual([
      { id: 211, name: 'Leftovers', is_holdable: true },
      { id: 247, name: 'Life Orb', is_holdable: true },
    ]);

    getSpy.mockRestore();
  });

  it('normalizes API_BASE_URL when generating held items request URL', async () => {
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: [] });

    const options = heldItemsQueryOptions(300);
    const queryFn = options.queryFn as () => Promise<unknown>;
    await queryFn();

    const calledUrl = getSpy.mock.calls[0][0];
    const expectedBase = API_BASE_URL.replace(/\/api$/, '');
    expect(calledUrl.startsWith(expectedBase)).toBe(true);

    getSpy.mockRestore();
  });
});
