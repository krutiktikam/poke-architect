import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server';
import { VersionProvider } from '../src/context/VersionContext';
import { VERSION_STORAGE_KEY } from '../src/context/VersionContext.types';
import { TeamProvider } from '../src/context/TeamContext';
import type { TeamMember } from '../src/context/TeamContext';
import PokemonConfigurator from '../src/components/Builder/PokemonConfigurator';

const mockPokemon: TeamMember = {
  id: 25,
  name: 'Pikachu',
  type1: 'electric',
  hp: 35,
  attack: 55,
  defense: 40,
  special_attack: 50,
  special_defense: 50,
  speed: 90,
  sprite_url: 'https://example.com/25.png',
  region: 'kanto',
  generation: 1,
  selectedMoves: [null, null, null, null],
};

const mockGlobalMoves = [
  { id: 1, name: 'Pound' },
  { id: 85, name: 'Thunderbolt' },
  { id: 86, name: 'Thunder Wave' },
  { id: 98, name: 'Quick Attack' },
  { id: 999, name: 'Illegal Move' },
];

const mockLearnsetResponse = {
  pokemon_id: 25,
  version_group: { id: 1, identifier: 'red-blue', generation_id: 1 },
  total: 4,
  moves: [
    {
      move: {
        id: 98,
        name: 'Quick Attack',
        type: 'normal',
        power: 40,
        accuracy: 100,
        pp: 30,
        priority: 1,
        damage_class: 'physical',
        effect_chance: null,
      },
      method: 'level-up',
      level: 16,
      order: 1,
    },
    {
      move: {
        id: 86,
        name: 'Thunder Wave',
        type: 'electric',
        power: null,
        accuracy: 90,
        pp: 20,
        priority: 0,
        damage_class: 'status',
        effect_chance: null,
      },
      method: 'level-up',
      level: 9,
      order: 2,
    },
    {
      move: {
        id: 85,
        name: 'Thunderbolt',
        type: 'electric',
        power: 90,
        accuracy: 100,
        pp: 15,
        priority: 0,
        damage_class: 'special',
        effect_chance: 10,
      },
      method: 'machine',
      level: 0,
      order: 3,
    },
    {
      move: {
        id: 1,
        name: 'Pound',
        type: 'normal',
        power: 40,
        accuracy: 100,
        pp: 35,
        priority: 0,
        damage_class: 'physical',
        effect_chance: null,
      },
      method: 'egg',
      level: 0,
      order: 4,
    },
  ],
};

describe('PokemonConfigurator game-aware move picker', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    localStorage.clear();

    server.use(
      http.get('*/api/moves', () => HttpResponse.json(mockGlobalMoves)),
      http.get('*/api/abilities', () => HttpResponse.json([{ id: 1, name: 'Static' }])),
      http.get('*/api/natures', () => HttpResponse.json([{ id: 1, name: 'Hardy' }])),
      http.get('*/api/items', () => HttpResponse.json([{ id: 1, name: 'Light Ball' }])),
      http.get('*/api/pokemon/25/moves', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('version_group') === 'red-blue') {
          return HttpResponse.json(mockLearnsetResponse);
        }
        return HttpResponse.json({
          pokemon_id: 25,
          version_group: { id: 0, identifier: 'none', generation_id: 1 },
          total: 0,
          moves: [],
        });
      })
    );
  });

  const renderConfigurator = (pokemon: TeamMember = mockPokemon) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <VersionProvider>
          <TeamProvider>
            <PokemonConfigurator pokemon={pokemon} />
          </TeamProvider>
        </VersionProvider>
      </QueryClientProvider>
    );
  };

  it('(a) game selected -> options come from mocked learnset and are grouped by method', async () => {
    // Select version id 1 (Red from red-blue version group)
    localStorage.setItem(VERSION_STORAGE_KEY, '1');

    renderConfigurator();

    await waitFor(() => {
      expect(screen.getByText('Configure Pikachu')).toBeInTheDocument();
    });

    await waitFor(() => {
      // Optgroups should exist
      const levelUpGroup = document.querySelector('optgroup[label="Level-up"]');
      const machineGroup = document.querySelector('optgroup[label="Machine"]');
      const eggGroup = document.querySelector('optgroup[label="Egg"]');

      expect(levelUpGroup).toBeInTheDocument();
      expect(machineGroup).toBeInTheDocument();
      expect(eggGroup).toBeInTheDocument();
    });

    // Level-up options should contain "Lv N"
    expect(screen.getAllByText(/Lv 9 Thunder Wave/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Lv 16 Quick Attack/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText('Thunderbolt')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Pound')[0]).toBeInTheDocument();

    // Illegal Move should not be in options
    expect(screen.queryByText('Illegal Move')).not.toBeInTheDocument();
  });

  it('(b) already-selected illegal move shows the "⚠ ... not learnable" label without clearing', async () => {
    localStorage.setItem(VERSION_STORAGE_KEY, '1');

    const pokemonWithIllegalMove: TeamMember = {
      ...mockPokemon,
      selectedMoves: [999, null, null, null],
    };

    renderConfigurator(pokemonWithIllegalMove);

    await waitFor(() => {
      expect(screen.getByText('Configure Pikachu')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/⚠ Illegal Move \(not learnable in Red\)/i)
      ).toBeInTheDocument();
    });

    const selectElements = screen.getAllByRole('combobox');
    // Moves slot 1 is the 4th select in the configurator (Item, Ability, Nature, Moves 1-4)
    const moveSlot1 = selectElements.find(
      (el) => (el as HTMLSelectElement).value === '999'
    );
    expect(moveSlot1).toBeDefined();
    expect((moveSlot1 as HTMLSelectElement).value).toBe('999');
  });

  it('(c) no game selected -> global moves list with hint', async () => {
    localStorage.clear();

    renderConfigurator();

    await waitFor(() => {
      expect(screen.getByText('Configure Pikachu')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText('Select a game in the header to see only learnable moves')
      ).toBeInTheDocument();
    });

    // Global moves (including Illegal Move) should be in the dropdown
    expect(screen.getAllByText('Illegal Move')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Thunderbolt')[0]).toBeInTheDocument();
    expect(document.querySelector('optgroup')).toBeNull();
  });

  it('(d) failed or empty learnset -> falls back to global list with one-line hint', async () => {
    localStorage.setItem(VERSION_STORAGE_KEY, '1');

    server.use(
      http.get('*/api/pokemon/25/moves', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderConfigurator();

    await waitFor(() => {
      expect(screen.getByText('Configure Pikachu')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Could not load learnset for Red\. Showing all moves/i)
      ).toBeInTheDocument();
    });

    // Global moves should be rendered as fallback
    expect(screen.getAllByText('Illegal Move')[0]).toBeInTheDocument();
    expect(document.querySelector('optgroup')).toBeNull();
  });
});
