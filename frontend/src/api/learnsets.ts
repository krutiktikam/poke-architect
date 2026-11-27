import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface MoveDetail {
  id: number;
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number | null;
  damage_class: string | null;
  effect_chance: number | null;
}

export interface LearnsetMove {
  move: MoveDetail;
  method: string;
  level: number;
  order: number | null;
}

export interface VersionGroupBrief {
  id: number;
  identifier: string;
  generation_id: number | null;
}

export interface PokemonLearnsetResponse {
  pokemon_id: number;
  version_group: VersionGroupBrief;
  total: number;
  moves: LearnsetMove[];
}

export const fetchPokemonLearnset = async (
  pokemonId: number,
  versionGroup: string,
  method?: string
): Promise<PokemonLearnsetResponse> => {
  const url = `${API_BASE_URL}/pokemon/${pokemonId}/moves`;
  const params: Record<string, string> = { version_group: versionGroup };
  if (method) {
    params.method = method;
  }
  const response = await axios.get<PokemonLearnsetResponse>(url, { params });
  return response.data;
};

export const useLearnset = (
  pokemonId: number | null | undefined,
  versionGroupIdentifier: string | null | undefined
) => {
  return useQuery<PokemonLearnsetResponse, Error>({
    queryKey: ['learnset', pokemonId, versionGroupIdentifier],
    queryFn: async () => {
      if (!pokemonId || !versionGroupIdentifier) {
        throw new Error('Both pokemonId and versionGroupIdentifier are required');
      }
      return fetchPokemonLearnset(pokemonId, versionGroupIdentifier);
    },
    enabled: Boolean(pokemonId && versionGroupIdentifier),
    staleTime: 1000 * 60 * 60 * 24, // ~24h
  });
};
