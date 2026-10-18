import { useContext } from 'react';
import { TeamContext } from './TeamContext.types';
import type { TeamContextType } from './TeamContext.types';

export const useTeam = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

export default useTeam;
