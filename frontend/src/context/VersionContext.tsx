import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  VERSION_STORAGE_KEY,
  LEGACY_VERSION_STORAGE_KEY,
  VersionContextInstance,
  type GameVersion,
  type VersionContextType,
} from './VersionContext.types';

export const VersionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedVersionId, setSelectedVersionIdState] = useState<number | null>(() => {
    try {
      if (typeof localStorage === 'undefined') return null;

      let stored = localStorage.getItem(VERSION_STORAGE_KEY);
      // Migrate legacy key if present on load
      const legacy = localStorage.getItem(LEGACY_VERSION_STORAGE_KEY);
      if (legacy !== null && legacy !== '') {
        if (!stored) {
          stored = legacy;
          localStorage.setItem(VERSION_STORAGE_KEY, legacy);
        }
        localStorage.removeItem(LEGACY_VERSION_STORAGE_KEY);
      }

      if (stored !== null && stored !== '') {
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? null : parsed;
      }
    } catch {
      // LocalStorage unavailable
    }
    return null;
  });

  const { data: versions = [], isPending, error } = useQuery<GameVersion[], Error>({
    queryKey: ['versions'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/versions`);
      return res.data;
    },
    staleTime: Infinity,
  });

  // Purely derive effective version ID during render without setting state in effect
  const effectiveVersionId = useMemo(() => {
    if (selectedVersionId === null) return null;
    if (versions.length === 0) return selectedVersionId;
    return versions.some((v) => v.id === selectedVersionId) ? selectedVersionId : null;
  }, [versions, selectedVersionId]);

  // Clean invalid local storage entry asynchronously if version is not valid
  useEffect(() => {
    if (versions.length > 0 && selectedVersionId !== null && effectiveVersionId === null) {
      try {
        localStorage.removeItem(VERSION_STORAGE_KEY);
        localStorage.removeItem(LEGACY_VERSION_STORAGE_KEY);
      } catch {
        // Ignore storage error
      }
    }
  }, [versions.length, selectedVersionId, effectiveVersionId]);

  const setSelectedVersionId = (id: number | null) => {
    setSelectedVersionIdState(id);
    try {
      if (id === null) {
        localStorage.removeItem(VERSION_STORAGE_KEY);
      } else {
        localStorage.setItem(VERSION_STORAGE_KEY, String(id));
      }
      localStorage.removeItem(LEGACY_VERSION_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
  };

  const selectedVersion = useMemo(() => {
    if (effectiveVersionId === null) return null;
    return versions.find((v) => v.id === effectiveVersionId) ?? null;
  }, [versions, effectiveVersionId]);

  const versionsByGeneration = useMemo(() => {
    const grouped: Record<number, GameVersion[]> = {};
    for (const v of versions) {
      const gen = v.generation_id || 1;
      if (!grouped[gen]) {
        grouped[gen] = [];
      }
      grouped[gen].push(v);
    }
    return grouped;
  }, [versions]);

  const value: VersionContextType = {
    versions,
    selectedVersionId: effectiveVersionId,
    selectedVersion,
    setSelectedVersionId,
    versionsByGeneration,
    isPending,
    error,
  };

  return <VersionContextInstance.Provider value={value}>{children}</VersionContextInstance.Provider>;
};
