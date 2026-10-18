import { createContext } from 'react';
import type { VisualQualityContextType } from './VisualQuality.utils';

export const VisualQualityContextInstance = createContext<VisualQualityContextType | undefined>(undefined);
