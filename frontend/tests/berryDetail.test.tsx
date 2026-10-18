import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { BerryDetail } from '../src/components/Berries/BerryDetail';
import {
  calculateGrowthTimeline,
  calculateNaturalGift,
  normalizeBerryFlavors,
  getBerrySpriteUrl,
} from '../src/components/Berries/BerryDetail.utils';
import type { BerryResponse } from '../src/api/queries';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('BerryDetail Pure Calculation Functions', () => {
  it('calculateGrowthTimeline computes 4 growth stages and harvest timeline correctly', () => {
    const timeline = calculateGrowthTimeline(3, 15);
    expect(timeline.growthTimePerStage).toBe(3);
    expect(timeline.totalHarvestHours).toBe(12);
    expect(timeline.formattedHarvestTime).toBe('12 hours');
    expect(timeline.stages).toHaveLength(4);
    expect(timeline.stages[0]).toEqual({
      stage: 1,
      name: 'Seedling',
      durationHours: 3,
      cumulativeHours: 3,
    });
    expect(timeline.stages[3]).toEqual({
      stage: 4,
      name: 'Berry Yield',
      durationHours: 3,
      cumulativeHours: 12,
    });
    // Soil dryness 15 => Math.round(100 / 15) = 7 hours
    expect(timeline.recommendedWateringIntervalHours).toBe(7);
  });

  it('calculateGrowthTimeline formats days for growth times >= 24h', () => {
    const timeline = calculateGrowthTimeline(6, 10);
    expect(timeline.totalHarvestHours).toBe(24);
    expect(timeline.formattedHarvestTime).toBe('24h (1 day)');

    const longTimeline = calculateGrowthTimeline(18, 5);
    expect(longTimeline.totalHarvestHours).toBe(72);
    expect(longTimeline.formattedHarvestTime).toBe('72h (3 days)');
  });

  it('calculateNaturalGift returns correct type, base power, and battle planner text', () => {
    const sampleBerry: BerryResponse = {
      id: 1,
      name: 'cheri-berry',
      natural_gift_power: 60,
      natural_gift_type: 'fire',
      flavors: [],
    };
    const result = calculateNaturalGift(sampleBerry);
    expect(result.type).toBe('fire');
    expect(result.power).toBe(60);
    expect(result.description).toContain('60 BP FIRE damage');
  });

  it('normalizeBerryFlavors aggregates and maps all 5 flavors with colors and contest stats', () => {
    const rawFlavors = [
      { id: 1, name: 'spicy', potency: 10 },
      { id: 1, name: 'spicy', potency: 10 }, // duplicate from backend
      { id: 2, name: 'dry', potency: 0 },
      { id: 3, name: 'sweet', potency: 15 },
      { id: 4, name: 'bitter', potency: 0 },
      { id: 5, name: 'sour', potency: 5 },
    ];
    const normalized = normalizeBerryFlavors(rawFlavors);
    expect(normalized).toHaveLength(5);

    const spicy = normalized.find((f) => f.key === 'spicy');
    expect(spicy?.potency).toBe(10);
    expect(spicy?.contest).toBe('Cool');

    const sweet = normalized.find((f) => f.key === 'sweet');
    expect(sweet?.potency).toBe(15);
    expect(sweet?.contest).toBe('Cute');

    const sour = normalized.find((f) => f.key === 'sour');
    expect(sour?.potency).toBe(5);
    expect(sour?.contest).toBe('Tough');
  });

  it('getBerrySpriteUrl builds valid PokéAPI sprite paths', () => {
    expect(getBerrySpriteUrl('cheri-berry', 'cheri-berry')).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cheri-berry.png'
    );
    expect(getBerrySpriteUrl(null, 'chesto')).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/chesto-berry.png'
    );
  });

  it('handles full BerryResponse object matching OpenAPI schema shape accurately', () => {
    const fullBerry: BerryResponse = {
      id: 10,
      name: 'sitrus',
      item_id: 155,
      item_name: 'sitrus-berry',
      firmness: 'very-hard',
      growth_time: 8,
      max_harvest: 5,
      size: 95,
      smoothness: 20,
      soil_dryness: 10,
      natural_gift_power: 80,
      natural_gift_type: 'psychic',
      flavors: [
        { id: 1, name: 'spicy', potency: 0 },
        { id: 2, name: 'dry', potency: 10 },
        { id: 3, name: 'sweet', potency: 10 },
        { id: 4, name: 'bitter', potency: 10 },
        { id: 5, name: 'sour', potency: 10 },
      ],
    };

    const naturalGift = calculateNaturalGift(fullBerry);
    expect(naturalGift.type).toBe('psychic');
    expect(naturalGift.power).toBe(80);
    expect(naturalGift.description).toContain('80 BP PSYCHIC damage');

    const timeline = calculateGrowthTimeline(fullBerry.growth_time, fullBerry.soil_dryness);
    expect(timeline.totalHarvestHours).toBe(32);
    expect(timeline.recommendedWateringIntervalHours).toBe(10);

    const flavors = normalizeBerryFlavors(fullBerry.flavors);
    expect(flavors).toHaveLength(5);
    expect(flavors.find((f) => f.key === 'dry')?.potency).toBe(10);

    const spriteUrl = getBerrySpriteUrl(fullBerry.item_name, fullBerry.name);
    expect(spriteUrl).toContain('sitrus-berry.png');
  });
});

describe('BerryDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders berry details, growth timeline, flavor profile, and Natural Gift mechanics', async () => {
    renderWithProviders(<BerryDetail berryId={1} />);

    // Wait for berry data to load (Cheri Berry)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /cheri berry/i })).toBeInTheDocument();
    });

    // Firmness and harvest
    expect(screen.getByText(/soft/i)).toBeInTheDocument();
    expect(screen.getByText(/12 hours/i)).toBeInTheDocument();

    // Growth timeline stages
    expect(screen.getByText(/seedling/i)).toBeInTheDocument();
    expect(screen.getByText(/sprout/i)).toBeInTheDocument();
    expect(screen.getByText(/bloom/i)).toBeInTheDocument();
    expect(screen.getByText(/berry yield/i)).toBeInTheDocument();

    // Watering schedule
    expect(screen.getByText(/every 7 hours/i)).toBeInTheDocument();

    // Radar chart and flavors
    expect(screen.getByLabelText(/flavor radar chart/i)).toBeInTheDocument();
    expect(screen.getAllByText(/spicy/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/dry/i).length).toBeGreaterThanOrEqual(1);

    // Natural Gift mechanics
    expect(screen.getByText(/^fire$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/60 bp/i).length).toBeGreaterThanOrEqual(1);
  });

  it('allows switching between berries via the select dropdown', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BerryDetail />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /select berry/i })).toBeInTheDocument();
    });

    // Switch to Chesto Berry (id 2)
    const select = screen.getByRole('combobox', { name: /select berry/i });
    await user.selectOptions(select, '2');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /chesto berry/i })).toBeInTheDocument();
      expect(screen.getByText(/^water$/i)).toBeInTheDocument(); // Natural gift type is water
    });
  });

  it('renders inside a modal Sheet when isOpen and onClose are passed', async () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <BerryDetail
        berryId={1}
        isOpen={true}
        onClose={handleClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /cheri berry details/i })).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    await userEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('is accessible and passes axe accessibility checks', async () => {
    const { container } = renderWithProviders(<BerryDetail berryId={1} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /cheri berry/i })).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
