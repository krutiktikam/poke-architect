export interface Pokemon {
  id: number;
  name: string;
  type1: string;
  type2?: string;
  hp: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
  sprite_url: string;
  region: string;
  generation: number;
  is_legendary?: boolean;
  is_mythical?: boolean;
  role?: string;
  tier?: string;
  usage_rate?: number;

  selectedItem?: number | null;
  selectedAbility?: number | null;
  selectedNature?: number | null;
  selectedMoves?: (number | null)[];
}

export interface AbilityResponse {
  id: number;
  name: string;
  effect?: string;
  short_effect?: string;
  generation?: number;
}

export interface ItemResponse {
  id: number;
  name: string;
  cost?: number;
  category?: string;
  effect?: string;
  sprite_url?: string;
}

export interface MoveResponse {
  id: number;
  name: string;
  type: string;
  power?: number;
  accuracy?: number;
  pp: number;
  priority: number;
  damage_class: string;
  effect_chance?: number;
}

export interface NatureResponse {
  id: number;
  name: string;
  decreased_stat?: string;
  increased_stat?: string;
}

export interface TeamAnalysisResponse {
  total_stats: Record<string, number>;
  type_coverage: Record<string, number>;
  suggestions: Pokemon[];
  advice: string[];
  archetype: string;
  health_score: string;
}