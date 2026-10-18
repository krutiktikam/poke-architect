import React from 'react';
import {
  Package,
  Pill,
  CircleDot,
  Disc3,
  Apple,
  Mail,
  Swords,
  Key,
} from 'lucide-react';

export interface PocketConfig {
  nameMatch: RegExp;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const POCKET_CONFIGS: Record<number, PocketConfig> = {
  1: { nameMatch: /misc|items/i, label: 'Items', icon: Package },
  2: { nameMatch: /medicine/i, label: 'Medicine', icon: Pill },
  3: { nameMatch: /pokeballs|poke-balls|balls/i, label: 'Poké Balls', icon: CircleDot },
  4: { nameMatch: /machines|tm/i, label: 'TMs & HMs', icon: Disc3 },
  5: { nameMatch: /berries/i, label: 'Berries', icon: Apple },
  6: { nameMatch: /mail/i, label: 'Mail', icon: Mail },
  7: { nameMatch: /battle/i, label: 'Battle Items', icon: Swords },
  8: { nameMatch: /key/i, label: 'Key Items', icon: Key },
};

export const getPocketMeta = (pocketId: number, pocketName: string): PocketConfig => {
  if (POCKET_CONFIGS[pocketId]) {
    return POCKET_CONFIGS[pocketId];
  }
  for (const config of Object.values(POCKET_CONFIGS)) {
    if (config.nameMatch.test(pocketName)) {
      return config;
    }
  }
  return { nameMatch: /.*/, label: pocketName, icon: Package };
};

export const getItemSpriteUrl = (identifier?: string | null, name?: string): string => {
  const slug = (identifier || name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
};
