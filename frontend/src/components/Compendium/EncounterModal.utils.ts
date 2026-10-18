import {
  MapPin,
  Gift,
  Footprints,
  Waves,
  Fish,
  Hammer,
  Trees,
  Mountain,
} from 'lucide-react';

/**
 * Returns appropriate Lucide icon component based on encounter method identifier
 */
export const getMethodIcon = (identifier?: string) => {
  switch (identifier?.toLowerCase()) {
    case 'walk':
      return Footprints;
    case 'surf':
      return Waves;
    case 'fish':
    case 'old-rod':
    case 'good-rod':
    case 'super-rod':
      return Fish;
    case 'gift':
      return Gift;
    case 'rock-smash':
      return Hammer;
    case 'headbutt':
      return Trees;
    case 'cave':
      return Mountain;
    default:
      return MapPin;
  }
};
