import type { LocationEncountersResponse } from '../../api/queries';

export type ObtainabilityStatus = 'catchable' | 'gift_static_only' | 'not_in_wild';

/**
 * Pure function to compute obtainability status from encounter records
 */
export const computeObtainabilityStatus = (
  locations?: LocationEncountersResponse[] | null
): ObtainabilityStatus => {
  if (!locations || locations.length === 0) return 'not_in_wild';

  let hasWild = false;
  let hasGiftOrStatic = false;

  for (const loc of locations) {
    for (const area of loc.areas || []) {
      for (const enc of area.encounters || []) {
        if (enc.chance === null || enc.method?.identifier === 'gift') {
          hasGiftOrStatic = true;
        } else {
          hasWild = true;
        }
      }
    }
  }

  if (hasWild) return 'catchable';
  if (hasGiftOrStatic) return 'gift_static_only';
  return 'not_in_wild';
};
