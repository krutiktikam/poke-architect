import { describe, it, expect } from 'vitest';
import versions from './fixtures/api/versions.json';

describe('M0 Tooling & Fixtures smoke test', () => {
  it('loads test fixtures correctly', () => {
    expect(versions).toBeDefined();
    expect(Array.isArray(versions)).toBe(true);
    expect(versions.length).toBeGreaterThan(0);
  });

  it('can fetch mocked endpoint through MSW', async () => {
    const res = await fetch('http://localhost:8000/api/versions');
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(versions.length);
  });
});
