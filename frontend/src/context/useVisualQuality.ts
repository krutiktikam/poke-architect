import { useContext } from 'react';
import { VisualQualityContextInstance } from './VisualQualityContextInstance';
import type { VisualQualityContextType } from './VisualQuality.utils';

export const useVisualQuality = (): VisualQualityContextType => {
  const context = useContext(VisualQualityContextInstance);
  if (!context) {
    throw new Error('useVisualQuality must be used within a VisualQualityProvider');
  }
  return context;
};

export default useVisualQuality;
