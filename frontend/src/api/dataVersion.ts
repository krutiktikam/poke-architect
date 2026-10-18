import { queryClient, ENCYCLOPEDIA_KEY_PREFIX } from './queryClient';
import { API_BASE_URL } from '../config';

const DATA_VERSION_STORAGE_KEY = 'poke_architect_data_version';

let memoryDataVersion: string | null = null;

export const getDataVersion = (): string => {
  if (memoryDataVersion) {
    return memoryDataVersion;
  }
  try {
    const stored = localStorage.getItem(DATA_VERSION_STORAGE_KEY);
    if (stored) {
      memoryDataVersion = stored;
      return stored;
    }
  } catch {
    // LocalStorage unavailable
  }
  return 'v1.0.0';
};

export const setDataVersion = (version: string): void => {
  const previous = getDataVersion();
  memoryDataVersion = version;
  try {
    localStorage.setItem(DATA_VERSION_STORAGE_KEY, version);
  } catch {
    // LocalStorage unavailable
  }

  if (previous !== version) {
    // If data version changed, drop all persisted and cached encyclopedia queries
    queryClient.removeQueries({ queryKey: [ENCYCLOPEDIA_KEY_PREFIX] });
  }
};

export const isEncyclopediaEndpoint = (url: string): boolean => {
  // Exclude non-encyclopedia endpoints
  const nonEncyclopediaPatterns = [
    /\/auth(\/|$|\?)/i,
    /\/teams(\/|$|\?)/i,
    /\/health(\/|$|\?)/i,
    /\/team-analysis(\/|$|\?)/i,
    /\/compare-teams(\/|$|\?)/i,
    /\/analytics(\/|$|\?)/i,
    /\/meta\/data-version(\/|$|\?)/i,
  ];

  if (nonEncyclopediaPatterns.some((pattern) => pattern.test(url))) {
    return false;
  }

  // Include encyclopedia endpoints
  const encyclopediaPatterns = [
    /\/pokemon(\/|$|\?)/i,
    /\/locations(\/|$|\?)/i,
    /\/items(\/|$|\?)/i,
    /\/berries(\/|$|\?)/i,
    /\/versions(\/|$|\?)/i,
    /\/regions(\/|$|\?)/i,
    /\/moves(\/|$|\?)/i,
    /\/abilities(\/|$|\?)/i,
    /\/natures(\/|$|\?)/i,
  ];

  return encyclopediaPatterns.some((pattern) => pattern.test(url));
};

export const appendDataVersion = (url: string, dv?: string): string => {
  if (url.includes('dv=')) {
    return url;
  }
  const version = dv || getDataVersion();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}dv=${encodeURIComponent(version)}`;
};

export const formatUrlWithDataVersion = (url: string, dv?: string): string => {
  if (isEncyclopediaEndpoint(url)) {
    return appendDataVersion(url, dv);
  }
  return url;
};

export const buildEncyclopediaKey = (entity: string, ...rest: unknown[]): readonly unknown[] => {
  return [ENCYCLOPEDIA_KEY_PREFIX, entity, getDataVersion(), ...rest] as const;
};

export const fetchDataVersion = async (): Promise<string | null> => {
  try {
    const metaUrl = `${API_BASE_URL}/meta/data-version`;
    const response = await fetch(metaUrl, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { data_version?: string };
    if (data && typeof data.data_version === 'string') {
      const newVersion = data.data_version;
      const current = getDataVersion();
      if (newVersion !== current) {
        setDataVersion(newVersion);
      }
      return newVersion;
    }
  } catch {
    // Network or server error - fallback gracefully
  }
  return null;
};
