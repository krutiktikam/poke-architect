import type { BerryResponse, BerryFlavorSchema } from '../../api/queries';

export interface GrowthStage {
  stage: number;
  name: string;
  durationHours: number;
  cumulativeHours: number;
}

export interface GrowthTimelineResult {
  growthTimePerStage: number;
  totalHarvestHours: number;
  formattedHarvestTime: string;
  soilDryness: number;
  recommendedWateringIntervalHours: number;
  stages: GrowthStage[];
}

export const calculateGrowthTimeline = (
  growthTimePerStage: number | null | undefined,
  soilDryness: number | null | undefined
): GrowthTimelineResult => {
  const time = growthTimePerStage && growthTimePerStage > 0 ? growthTimePerStage : 4;
  const totalHours = time * 4;
  const dryness = soilDryness && soilDryness > 0 ? soilDryness : 15;
  const wateringInterval = Math.max(1, Math.min(24, Math.round(100 / dryness)));

  const stages: GrowthStage[] = [
    { stage: 1, name: 'Seedling', durationHours: time, cumulativeHours: time },
    { stage: 2, name: 'Sprout', durationHours: time, cumulativeHours: time * 2 },
    { stage: 3, name: 'Bloom', durationHours: time, cumulativeHours: time * 3 },
    { stage: 4, name: 'Berry Yield', durationHours: time, cumulativeHours: totalHours },
  ];

  let formatted = `${totalHours} hours`;
  if (totalHours >= 24) {
    const days = totalHours / 24;
    formatted = `${totalHours}h (${days === 1 ? '1 day' : `${days} days`})`;
  }

  return {
    growthTimePerStage: time,
    totalHarvestHours: totalHours,
    formattedHarvestTime: formatted,
    soilDryness: dryness,
    recommendedWateringIntervalHours: wateringInterval,
    stages,
  };
};

export interface NaturalGiftResult {
  type: string;
  power: number;
  description: string;
}

export const calculateNaturalGift = (berry: BerryResponse): NaturalGiftResult => {
  const type = (berry.natural_gift_type || 'normal').toLowerCase();
  const power = berry.natural_gift_power ?? 60;
  const description = `Deals ${power} BP ${type.toUpperCase()} damage when used with the move Natural Gift.`;
  return { type, power, description };
};

export interface NormalizedFlavor {
  key: 'spicy' | 'dry' | 'sweet' | 'bitter' | 'sour';
  name: string;
  potency: number;
  color: string;
  contest: string;
}

export const FLAVOR_CONFIGS: Record<
  'spicy' | 'dry' | 'sweet' | 'bitter' | 'sour',
  { name: string; color: string; contest: string }
> = {
  spicy: { name: 'Spicy', color: '#ef4444', contest: 'Cool' },
  dry: { name: 'Dry', color: '#3b82f6', contest: 'Beauty' },
  sweet: { name: 'Sweet', color: '#ec4899', contest: 'Cute' },
  bitter: { name: 'Bitter', color: '#10b981', contest: 'Smart' },
  sour: { name: 'Sour', color: '#eab308', contest: 'Tough' },
};

export const normalizeBerryFlavors = (flavors?: BerryFlavorSchema[] | null): NormalizedFlavor[] => {
  const keys: ('spicy' | 'dry' | 'sweet' | 'bitter' | 'sour')[] = [
    'spicy',
    'dry',
    'sweet',
    'bitter',
    'sour',
  ];

  const potencyMap: Record<string, number> = {
    spicy: 0,
    dry: 0,
    sweet: 0,
    bitter: 0,
    sour: 0,
  };

  if (flavors) {
    flavors.forEach((f) => {
      const k = f.name.toLowerCase();
      if (k in potencyMap) {
        potencyMap[k] = Math.max(potencyMap[k], f.potency);
      }
    });
  }

  return keys.map((k) => ({
    key: k,
    name: FLAVOR_CONFIGS[k].name,
    potency: potencyMap[k],
    color: FLAVOR_CONFIGS[k].color,
    contest: FLAVOR_CONFIGS[k].contest,
  }));
};

export const getBerrySpriteUrl = (itemName?: string | null, name?: string): string => {
  let slug = (itemName || name || '').toLowerCase().trim();
  if (!slug.endsWith('-berry') && !slug.includes('berry')) {
    slug = `${slug}-berry`;
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
};
