export type Pokemon = {
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
};
