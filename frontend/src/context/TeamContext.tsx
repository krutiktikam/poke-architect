import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Pokemon } from '../types';

interface TeamContextType {
  team: Pokemon[];
  addToTeam: (pokemon: Pokemon) => void;
  removeFromTeam: (id: number) => void;
  clearTeam: () => void;
  loadTeam: (team: Pokemon[]) => void;
  targetGen: number;
  setTargetGen: (gen: number) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [team, setTeam] = useState<Pokemon[]>([]);
  const [targetGen, setTargetGen] = useState<number>(9); // Default to latest gen

  useEffect(() => {
    const savedTeam = localStorage.getItem('poke-team');
    if (savedTeam) {
      try {
        setTeam(JSON.parse(savedTeam));
      } catch (e) {
        console.error('Failed to parse saved team', e);
      }
    }
    const savedGen = localStorage.getItem('poke-target-gen');
    if (savedGen) {
      setTargetGen(parseInt(savedGen));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('poke-team', JSON.stringify(team));
  }, [team]);

  useEffect(() => {
    localStorage.setItem('poke-target-gen', targetGen.toString());
  }, [targetGen]);

  const addToTeam = (pokemon: Pokemon) => {
    if (team.length >= 6) return;
    if (team.find(p => p.id === pokemon.id)) return;
    
    // Constraint: Only one legendary/mythical per team
    const isNewLegendary = pokemon.is_legendary || pokemon.is_mythical;
    const hasLegendary = team.some(p => p.is_legendary || p.is_mythical);
    
    if (isNewLegendary && hasLegendary) {
      alert('Strategic Constraint: Only one Legendary or Mythical Pokémon is allowed per team to maintain competitive balance.');
      return;
    }

    setTeam([...team, pokemon]);
  };

  const removeFromTeam = (id: number) => {
    setTeam(team.filter(p => p.id !== id));
  };

  const clearTeam = () => {
    setTeam([]);
  };

  const loadTeam = (newTeam: Pokemon[]) => {
    setTeam(newTeam);
  };

  return (
    <TeamContext.Provider value={{ team, addToTeam, removeFromTeam, clearTeam, loadTeam, targetGen, setTargetGen }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
