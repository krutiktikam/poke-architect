import { createContext } from 'react';

export interface GameVersion {
  id: number;
  identifier: string;
  name: string;
  version_group_id: number;
  version_group_identifier: string;
  generation_id: number;
}

export interface VersionContextType {
  versions: GameVersion[];
  selectedVersionId: number | null;
  selectedVersion: GameVersion | null;
  setSelectedVersionId: (id: number | null) => void;
  versionsByGeneration: Record<number, GameVersion[]>;
  isPending: boolean;
  error: Error | null;
}

export const VERSION_STORAGE_KEY = 'poke_architect_selected_version_id';

export const VersionContextInstance = createContext<VersionContextType | undefined>(undefined);
