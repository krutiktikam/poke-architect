import { http, HttpResponse } from 'msw';
import eeveeEvolutions from '../fixtures/api/eevee_evolutions.json';
import raltsEvolutions from '../fixtures/api/ralts_evolutions.json';
import applinEvolutions from '../fixtures/api/applin_evolutions.json';
import pokemonEncounters from '../fixtures/api/pokemon_encounters.json';
import giftEncounters from '../fixtures/api/gift_encounters.json';
import versions from '../fixtures/api/versions.json';
import regions from '../fixtures/api/regions.json';
import itemPockets from '../fixtures/api/item_pockets.json';
import berries from '../fixtures/api/berries.json';
import dataVersion from '../fixtures/api/data_version.json';

export const handlers = [
  http.get('*/api/versions', () => {
    return HttpResponse.json(versions);
  }),
  http.get('*/api/regions', () => {
    return HttpResponse.json(regions);
  }),
  http.get('*/api/items/pockets', () => {
    return HttpResponse.json(itemPockets);
  }),
  http.get('*/api/berries', () => {
    return HttpResponse.json(berries);
  }),
  http.get('*/api/meta/data-version', () => {
    return HttpResponse.json(dataVersion);
  }),
  http.get('*/api/pokemon/133/evolutions', () => {
    return HttpResponse.json(eeveeEvolutions);
  }),
  http.get('*/api/pokemon/280/evolutions', () => {
    return HttpResponse.json(raltsEvolutions);
  }),
  http.get('*/api/pokemon/840/evolutions', () => {
    return HttpResponse.json(applinEvolutions);
  }),
  http.get('*/api/pokemon/25/encounters', () => {
    return HttpResponse.json(pokemonEncounters);
  }),
  http.get('*/api/pokemon/1/encounters', () => {
    return HttpResponse.json(giftEncounters);
  }),
  // Generic fallbacks
  http.get('*/api/pokemon/:id/evolutions', ({ params }) => {
    const id = Number(params.id);
    if (id === 133) return HttpResponse.json(eeveeEvolutions);
    if (id === 280) return HttpResponse.json(raltsEvolutions);
    if (id === 840) return HttpResponse.json(applinEvolutions);
    if (id === 214) {
      return HttpResponse.json({
        chain_id: 110,
        nodes: [
          {
            species_id: 214,
            identifier: 'heracross',
            name: 'Heracross',
            pokemon_id: 214,
            sprite_url: null,
          },
        ],
        edges: [],
      });
    }
    return HttpResponse.json(eeveeEvolutions);
  }),
  http.get('*/api/pokemon/:id/encounters', ({ params, request }) => {
    const id = Number(params.id);
    const url = new URL(request.url);
    const versionId = url.searchParams.get('version_id');
    if (id === 999 || versionId === '999') return HttpResponse.json([]);
    if (id === 1) return HttpResponse.json(giftEncounters);
    return HttpResponse.json(pokemonEncounters);
  }),
];
