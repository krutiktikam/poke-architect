import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { EvolutionTree } from '../src/components/Compendium/EvolutionTree';
import { formatEvolutionRequirement } from '../src/components/Compendium/EvolutionTree.utils';
import type { EvolutionEdge } from '../src/api/queries';

describe('formatEvolutionRequirement', () => {
  it('formats level-up minimum level correctly', () => {
    const edge: EvolutionEdge = {
      from_species_id: 1,
      to_species_id: 2,
      trigger: { id: 1, identifier: 'level-up', name: 'Level up' },
      requirements: { min_level: 30 },
    };
    expect(formatEvolutionRequirement(edge)).toBe('Level 30');
  });

  it('formats trigger items like Water Stone', () => {
    const edge: EvolutionEdge = {
      from_species_id: 133,
      to_species_id: 134,
      trigger: { id: 3, identifier: 'use-item', name: 'Use item' },
      requirements: {
        trigger_item: { id: 84, name: 'Water Stone', identifier: 'water-stone' },
      },
    };
    expect(formatEvolutionRequirement(edge)).toBe('Water Stone');
  });

  it('formats trade holding item like Kings Rock', () => {
    const edge: EvolutionEdge = {
      from_species_id: 60,
      to_species_id: 186,
      trigger: { id: 2, identifier: 'trade', name: 'Trade' },
      requirements: {
        held_item: { id: 198, name: "King's Rock", identifier: 'kings-rock' },
      },
    };
    expect(formatEvolutionRequirement(edge)).toBe("Trade holding King's Rock");
  });

  it('formats high friendship with time of day (day/night)', () => {
    const dayEdge: EvolutionEdge = {
      from_species_id: 133,
      to_species_id: 196,
      trigger: { id: 1, identifier: 'level-up', name: 'Level up' },
      requirements: { min_happiness: 160, time_of_day: 'day' },
    };
    expect(formatEvolutionRequirement(dayEdge)).toBe('High Friendship + Daytime');

    const nightEdge: EvolutionEdge = {
      from_species_id: 133,
      to_species_id: 197,
      trigger: { id: 1, identifier: 'level-up', name: 'Level up' },
      requirements: { min_happiness: 160, time_of_day: 'night' },
    };
    expect(formatEvolutionRequirement(nightEdge)).toBe('High Friendship + Nighttime');
  });

  it('formats gender requirements (Male/Female)', () => {
    const maleEdge: EvolutionEdge = {
      from_species_id: 281,
      to_species_id: 475,
      trigger: { id: 3, identifier: 'use-item', name: 'Use item' },
      requirements: {
        trigger_item: { id: 109, name: 'Dawn Stone', identifier: 'dawn-stone' },
        gender: 2,
      },
    };
    expect(formatEvolutionRequirement(maleEdge)).toBe('Dawn Stone + Male');

    const femaleEdge: EvolutionEdge = {
      from_species_id: 415,
      to_species_id: 416,
      trigger: { id: 1, identifier: 'level-up', name: 'Level up' },
      requirements: { min_level: 21, gender: 1 },
    };
    expect(formatEvolutionRequirement(femaleEdge)).toBe('Level 21 + Female');
  });

  it('formats location, known move, and party species requirements', () => {
    const locEdge: EvolutionEdge = {
      from_species_id: 133,
      to_species_id: 470,
      trigger: { id: 1, identifier: 'level-up', name: 'Level up' },
      requirements: {
        location: { id: 8, name: 'Eterna Forest', identifier: 'eterna-forest' },
      },
    };
    expect(formatEvolutionRequirement(locEdge)).toBe('at Eterna Forest');

    const moveEdge: EvolutionEdge = {
      from_species_id: 1011,
      to_species_id: 1019,
      trigger: { id: 1, identifier: 'level-up', name: 'Level up' },
      requirements: {
        known_move: { id: 913, name: 'dragon-cheer', identifier: 'dragon-cheer' },
      },
    };
    expect(formatEvolutionRequirement(moveEdge)).toBe('knowing Dragon Cheer');

    const partyEdge: EvolutionEdge = {
      from_species_id: 223,
      to_species_id: 226,
      trigger: { id: 1, identifier: 'level-up', name: 'Level up' },
      requirements: {
        party_species: { id: 223, name: 'Remoraid', identifier: 'remoraid' },
      },
    };
    expect(formatEvolutionRequirement(partyEdge)).toBe('with Remoraid in party');
  });
});

describe('EvolutionTree Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderTree = (props: {
    pokemonId: number;
    currentSpeciesId?: number;
    onSelectSpecies?: (id: number) => void;
  }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EvolutionTree {...props} />
      </QueryClientProvider>
    );
  };

  it('renders Eevee wide branching evolution tree with 8 evolutions', async () => {
    renderTree({ pokemonId: 133, currentSpeciesId: 133 });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eevee \(Current\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Vaporeon/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Jolteon/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Flareon/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Espeon/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Umbreon/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Leafeon/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Glaceon/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sylveon/i })).toBeInTheDocument();
    });
  });

  it('renders Ralts branched tree with gender-split Gallade and Gardevoir', async () => {
    renderTree({ pokemonId: 280, currentSpeciesId: 280 });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ralts/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Kirlia/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Gardevoir/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Gallade/i })).toBeInTheDocument();
      expect(screen.getByText(/Dawn Stone \+ Male/i)).toBeInTheDocument();
    });
  });

  it('renders Applin multi-tier branched tree with Hydrapple', async () => {
    renderTree({ pokemonId: 840, currentSpeciesId: 840 });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Applin/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Flapple/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Appletun/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Dipplin/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hydrapple/i })).toBeInTheDocument();
    });
  });

  it('renders single-stage Pokémon with single-stage badge', async () => {
    renderTree({ pokemonId: 214, currentSpeciesId: 214 });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Heracross \(Current\)/i })).toBeInTheDocument();
      expect(screen.getByText(/Single Stage \(Does not evolve\)/i)).toBeInTheDocument();
    });
  });

  it('fires onSelectSpecies when a node is clicked', async () => {
    const handleSelect = vi.fn();
    renderTree({ pokemonId: 280, onSelectSpecies: handleSelect });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Kirlia/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Kirlia/i }));
    expect(handleSelect).toHaveBeenCalledWith(281, 281);
  });

  it('is accessible and passes axe checks', async () => {
    const { container } = renderTree({ pokemonId: 133 });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eevee/i })).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
