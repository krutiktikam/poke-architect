import { useContext } from 'react';
import { VersionContextInstance } from './VersionContext.types';
import type { VersionContextType } from './VersionContext.types';

export const useVersion = (): VersionContextType => {
  const context = useContext(VersionContextInstance);
  if (!context) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
};

export default useVersion;
