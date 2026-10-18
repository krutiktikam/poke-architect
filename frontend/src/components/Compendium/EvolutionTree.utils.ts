import type { EvolutionEdge } from '../../api/queries';

/**
 * Capitalizes string or converts kebab-case to Title Case
 */
export const formatName = (str?: string | null): string => {
  if (!str) return '';
  return str
    .split(/[-_ ]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Pure function to format evolution requirements into human-readable label
 */
export const formatEvolutionRequirement = (edge: EvolutionEdge): string => {
  const req = edge.requirements;
  const triggerIdent = edge.trigger?.identifier || '';
  const parts: string[] = [];

  // 1. Trigger Item (e.g. Water Stone, Dawn Stone, Tart Apple)
  if (req.trigger_item?.name) {
    parts.push(req.trigger_item.name);
  }

  // 2. Minimum Level
  if (req.min_level !== null && req.min_level !== undefined) {
    parts.push(`Level ${req.min_level}`);
  }

  // 3. Trade triggers
  if (triggerIdent === 'trade') {
    if (req.held_item?.name) {
      parts.push(`Trade holding ${req.held_item.name}`);
    } else if (req.trade_species?.name) {
      parts.push(`Trade for ${req.trade_species.name}`);
    } else if (!parts.some((p) => p.startsWith('Trade'))) {
      parts.push('Trade');
    }
  } else if (req.held_item?.name) {
    parts.push(`holding ${req.held_item.name}`);
  }

  // 4. Friendship / Happiness
  if (req.min_happiness !== null && req.min_happiness !== undefined) {
    parts.push('High Friendship');
  }

  // 5. Affection
  if (req.min_affection !== null && req.min_affection !== undefined) {
    parts.push('High Affection');
  }

  // 6. Beauty
  if (req.min_beauty !== null && req.min_beauty !== undefined) {
    parts.push('High Beauty');
  }

  // 7. Time of Day
  if (req.time_of_day) {
    if (req.time_of_day.toLowerCase() === 'day') {
      parts.push('Daytime');
    } else if (req.time_of_day.toLowerCase() === 'night') {
      parts.push('Nighttime');
    } else {
      parts.push(formatName(req.time_of_day));
    }
  }

  // 8. Location
  if (req.location?.name) {
    parts.push(`at ${req.location.name}`);
  }

  // 9. Known Move
  if (req.known_move?.name) {
    parts.push(`knowing ${formatName(req.known_move.name)}`);
  }

  // 10. Known Move Type
  if (req.known_move_type?.name || req.known_move_type?.identifier) {
    const typeName = formatName(req.known_move_type.name || req.known_move_type.identifier);
    parts.push(`knowing ${typeName}-type move`);
  }

  // 11. Party Species
  if (req.party_species?.name) {
    parts.push(`with ${req.party_species.name} in party`);
  }

  // 12. Party Type
  if (req.party_type?.name || req.party_type?.identifier) {
    const typeName = formatName(req.party_type.name || req.party_type.identifier);
    parts.push(`with ${typeName}-type in party`);
  }

  // 13. Gender
  if (req.gender !== null && req.gender !== undefined) {
    if (req.gender === 1) parts.push('Female');
    else if (req.gender === 2) parts.push('Male');
  }

  // 14. Relative Physical Stats (Tyrogue)
  if (req.relative_physical_stats !== null && req.relative_physical_stats !== undefined) {
    if (req.relative_physical_stats === 1) parts.push('Attack > Defense');
    else if (req.relative_physical_stats === -1) parts.push('Attack < Defense');
    else if (req.relative_physical_stats === 0) parts.push('Attack = Defense');
  }

  // 15. Overworld rain
  if (req.needs_overworld_rain) {
    parts.push('during rain');
  }

  // 16. Turn upside down (Inkay)
  if (req.turn_upside_down) {
    parts.push('turn device upside-down');
  }

  // Fallbacks if no specific criteria were collected
  if (parts.length === 0) {
    if (triggerIdent === 'level-up') {
      return 'Level up';
    }
    if (triggerIdent === 'shed') {
      return 'Shed into empty slot';
    }
    if (edge.trigger?.name) {
      return edge.trigger.name;
    }
    return 'Evolution';
  }

  return parts.join(' + ');
};
