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
};
