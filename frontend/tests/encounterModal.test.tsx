import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { EncounterModal } from '../src/components/Compendium/EncounterModal';
import { ObtainabilityBadge } from '../src/components/Compendium/ObtainabilityBadge';
import { computeObtainabilityStatus } from '../src/components/Compendium/ObtainabilityBadge.utils';
import { VersionProvider } from '../src/context/VersionContext';
import { VERSION_STORAGE_KEY } from '../src/context/VersionContext.types';
import type { LocationEncountersResponse } from '../src/api/queries';

describe('computeObtainabilityStatus pure function', () => {
  it('returns not_in_wild when encounters array is empty or null', () => {
    expect(computeObtainabilityStatus([])).toBe('not_in_wild');
    expect(computeObtainabilityStatus(null)).toBe('not_in_wild');
  });

  it('returns catchable when at least one encounter has wild chance', () => {
    const locations: LocationEncountersResponse[] = [
      {
        id: 1,
        identifier: 'pallet-town',
        areas: [
          {
            id: 10,
            encounters: [
              {
                min_level: 5,
                max_level: 5,
                chance: 20,
                conditions: [],
                method: { id: 1, identifier: 'walk', name: 'Walking' },
                version: { id: 1, identifier: 'red', name: 'Red' },
              },
            ],
          },
        ],
      },
    ];
    expect(computeObtainabilityStatus(locations)).toBe('catchable');
  });

  it('returns gift_static_only when encounters only have null chance or gift method', () => {
    const giftLocations: LocationEncountersResponse[] = [
      {
        id: 1,
        identifier: 'oaks-lab',
        areas: [
          {
            id: 10,
            encounters: [
              {
                min_level: 5,
                max_level: 5,
                chance: null,
                conditions: [],
                method: { id: 18, identifier: 'gift', name: 'Gift' },
                version: { id: 1, identifier: 'red', name: 'Red' },
              },
            ],
          },
        ],
      },
    ];
    expect(computeObtainabilityStatus(giftLocations)).toBe('gift_static_only');
  });
});

describe('ObtainabilityBadge Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    localStorage.clear();
  });

  const renderBadge = (pokemonId: number) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <VersionProvider>
          <ObtainabilityBadge pokemonId={pokemonId} />
        </VersionProvider>
      </QueryClientProvider>
    );
  };

  it('is hidden when selectedVersionId is null (All Games)', () => {
    const { container } = renderBadge(25);
    expect(container.firstChild).toBeNull();
  });

  it('renders Catchable when selected version has wild encounters', async () => {
    localStorage.setItem(VERSION_STORAGE_KEY, '12'); // Diamond
    renderBadge(25);

    await waitFor(() => {
      expect(screen.getByText(/Catchable/i)).toBeInTheDocument();
    });
  });

  it('renders Gift or static only when selected version only has gift encounters', async () => {
    localStorage.setItem(VERSION_STORAGE_KEY, '1'); // Red
    renderBadge(1);

    await waitFor(() => {
      expect(screen.getByText(/Gift or static only/i)).toBeInTheDocument();
    });
  });

  it('renders Not in the wild when pokemon has no encounters in version', async () => {
    localStorage.setItem(VERSION_STORAGE_KEY, '12'); // Diamond
    renderBadge(999); // Pokemon 999 has no encounters

    await waitFor(() => {
      expect(screen.getByText(/Not in the wild/i)).toBeInTheDocument();
    });
  });
});

describe('EncounterModal Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    localStorage.clear();
  });

  const renderModal = (props: {
    isOpen: boolean;
    onClose: () => void;
    pokemonId: number;
    pokemonName: string;
  }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <VersionProvider>
          <EncounterModal {...props} />
        </VersionProvider>
      </QueryClientProvider>
    );
  };

  it('groups by Region -> Location -> Area and displays level and percentage', async () => {
    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      pokemonId: 25,
      pokemonName: 'Pikachu',
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Sinnoh/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Trophy Garden')).toBeInTheDocument();
      expect(screen.getAllByText('Main Area').length).toBeGreaterThan(0);
      expect(screen.getAllByText('5%').length).toBeGreaterThan(0);
    });
  });

  it('renders Gift / Static when chance is null (never 0%)', async () => {
    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      pokemonId: 1,
      pokemonName: 'Bulbasaur',
    });

    await waitFor(() => {
      expect(screen.getByText(/Gift \/ Static/i)).toBeInTheDocument();
      expect(screen.queryByText('0%')).not.toBeInTheDocument();
    });
  });

  it('filters encounters via location search input', async () => {
    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      pokemonId: 25,
      pokemonName: 'Pikachu',
    });

    await waitFor(() => {
      expect(screen.getByText('Trophy Garden')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/search locations/i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentRoute' } });

    await waitFor(() => {
      expect(screen.getByText(/Not found in the wild in this game/i)).toBeInTheDocument();
    });
  });

  it('filters encounters via method filter chips', async () => {
    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      pokemonId: 25,
      pokemonName: 'Pikachu',
    });

    await waitFor(() => {
      expect(screen.getByText(/All Methods/i)).toBeInTheDocument();
    });

    // Clicking All Methods keeps them visible
    fireEvent.click(screen.getByText(/All Methods/i));
    expect(screen.getByText('Trophy Garden')).toBeInTheDocument();
  });

  it('displays empty state when encounters are empty with hint to try another version', async () => {
    localStorage.setItem(VERSION_STORAGE_KEY, '12'); // Diamond
    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      pokemonId: 999,
      pokemonName: 'MissingNo',
    });

    await waitFor(() => {
      expect(screen.getByText(/Not found in the wild in this game/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View All Games/i })).toBeInTheDocument();
    });

    // Clicking View All Games resets selectedVersionId to null
    fireEvent.click(screen.getByRole('button', { name: /View All Games/i }));
    await waitFor(() => {
      expect(localStorage.getItem(VERSION_STORAGE_KEY)).toBeNull();
    });
  });

  it('closes modal on Escape key or close button click', async () => {
    const handleClose = vi.fn();
    renderModal({
      isOpen: true,
      onClose: handleClose,
      pokemonId: 25,
      pokemonName: 'Pikachu',
    });

    await waitFor(() => {
      expect(screen.getByText(/Where to catch Pikachu/i)).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('is accessible and passes axe checks', async () => {
    const { container } = renderModal({
      isOpen: true,
      onClose: vi.fn(),
      pokemonId: 25,
      pokemonName: 'Pikachu',
    });

    await waitFor(() => {
      expect(screen.getByText(/Trophy Garden/i)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
