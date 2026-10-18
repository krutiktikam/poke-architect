import { createContext } from 'react';
import type { Pokemon } from '../types';

export interface TeamMember extends Pokemon {
  selectedMoves?: (number | null)[]; // store move IDs, null for empty slot
  selectedItem?: number | null; // store item ID
  selectedAbility?: number | null; // store ability ID
  selectedNature?: number | null; // store nature ID
}

export interface TeamContextType {
  team: TeamMember[];
  addToTeam: (pokemon: Pokemon) => void;
  removeFromTeam: (id: number) => void;
  replaceInTeam: (newPokemon: Pokemon, oldPokemonId: number) => void;
  clearTeam: () => void;
  loadTeam: (team: TeamMember[]) => void;
  targetGen: number;
  setTargetGen: (gen: number) => void;
  updateTeamMember: (pokemonId: number, updates: Partial<TeamMember>) => void;
}

export const TeamContext = createContext<TeamContextType | undefined>(undefined);
