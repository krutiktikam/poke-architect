import { queryOptions } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { formatUrlWithDataVersion, buildEncyclopediaKey } from './dataVersion';
import type { components } from './schema';

export type EvolutionChainResponse = components['schemas']['EvolutionChainResponse'];
export type EvolutionNode = components['schemas']['EvolutionNode'];
export type EvolutionEdge = components['schemas']['EvolutionEdge'];
export type EvolutionRequirements = components['schemas']['EvolutionRequirements'];
export type LocationEncountersResponse = components['schemas']['LocationEncountersResponse'];
export type LocationAreaEncountersSchema = components['schemas']['LocationAreaEncountersSchema'];
export type EncounterDetailSchema = components['schemas']['EncounterDetailSchema'];
export type ItemPocketSchema = components['schemas']['ItemPocketSchema'];
export type PocketCategorySchema = components['schemas']['PocketCategorySchema'];
export type PocketItemSchema = components['schemas']['PocketItemSchema'];
export type BerryResponse = components['schemas']['BerryResponse'];
export type BerryFlavorSchema = components['schemas']['BerryFlavorSchema'];

/**
 * Shared query options for Pokemon Evolution Tree
 */
export const evolutionQueryOptions = (pokemonId: number) => {
  return queryOptions<EvolutionChainResponse, Error>({
    queryKey: buildEncyclopediaKey('evolutions', pokemonId),
    queryFn: async () => {
      const url = formatUrlWithDataVersion(`${API_BASE_URL}/pokemon/${pokemonId}/evolutions`);
      const response = await axios.get<EvolutionChainResponse>(url);
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};

/**
 * Shared query options for Pokemon Encounters
 */
export const encountersQueryOptions = (pokemonId: number, versionId?: number | null) => {
  const normVersionId = versionId ?? null;
  return queryOptions<LocationEncountersResponse[], Error>({
    queryKey: buildEncyclopediaKey('encounters', pokemonId, normVersionId ?? 'all'),
    queryFn: async () => {
      const baseUrl = `${API_BASE_URL}/pokemon/${pokemonId}/encounters`;
      const params = normVersionId !== null ? `?version_id=${normVersionId}` : '';
      const url = formatUrlWithDataVersion(`${baseUrl}${params}`);
      const response = await axios.get<LocationEncountersResponse[]>(url);
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};

/**
 * Shared query options for Item Pockets hierarchical encyclopedia data
 */
export const itemPocketsQueryOptions = () => {
  return queryOptions<ItemPocketSchema[], Error>({
    queryKey: buildEncyclopediaKey('item-pockets'),
    queryFn: async () => {
      const url = formatUrlWithDataVersion(`${API_BASE_URL}/items/pockets`);
      const response = await axios.get<ItemPocketSchema[]>(url);
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};

/**
 * Shared query options for Berries encyclopedia data
 */
export const berriesQueryOptions = (limit = 100, offset = 0) => {
  return queryOptions<BerryResponse[], Error>({
    queryKey: buildEncyclopediaKey('berries', limit, offset),
    queryFn: async () => {
      const url = formatUrlWithDataVersion(`${API_BASE_URL}/berries?limit=${limit}&offset=${offset}`);
      const response = await axios.get<BerryResponse[]>(url);
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};

export type ItemEffectResponse = components['schemas']['ItemEffectResponse'];

/**
 * Shared query options for individual Item Effect details
 */
export const itemEffectQueryOptions = (itemId: number | null | undefined) => {
  return queryOptions<ItemEffectResponse | null, Error>({
    queryKey: buildEncyclopediaKey('item-effect', itemId ?? 0),
    queryFn: async () => {
      if (!itemId) return null;
      const url = formatUrlWithDataVersion(`${API_BASE_URL}/items/${itemId}/effect`);
      const response = await axios.get<ItemEffectResponse>(url);
      return response.data;
    },
    enabled: typeof itemId === 'number' && itemId > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};


