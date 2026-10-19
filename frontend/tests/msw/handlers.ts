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
  http.get('*/api/items', ({ request }) => {
    const url = new URL(request.url);
    const holdable = url.searchParams.get('holdable');
    const sort = url.searchParams.get('sort');
    const limit = Number(url.searchParams.get('limit') || '100');
    let items = [
      { id: 211, name: 'Leftovers', is_holdable: true, category: 'Held Items' },
      { id: 247, name: 'Life Orb', is_holdable: true, category: 'Held Items' },
      { id: 242, name: 'Choice Scarf', is_holdable: true, category: 'Held Items' },
      { id: 1, name: 'Master Ball', is_holdable: false, category: 'Pokeballs' },
      { id: 17, name: 'Potion', is_holdable: false, category: 'Medicine' },
    ];
    if (holdable === 'true') {
      items = items.filter((i) => i.is_holdable);
    } else if (holdable === 'false') {
      items = items.filter((i) => !i.is_holdable);
    }
    if (sort === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    }
    return HttpResponse.json(items.slice(0, limit));
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
