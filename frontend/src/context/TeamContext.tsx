import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Pokemon } from '../types';

interface TeamContextType {
  team: Pokemon[];
  addToTeam: (pokemon: Pokemon) => void;
  removeFromTeam: (id: number) => void;
  clearTeam: () => void;
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
    if (team.length < 6 && !team.find(p => p.id === pokemon.id)) {
      setTeam([...team, pokemon]);
    }
  };

  const removeFromTeam = (id: number) => {
    setTeam(team.filter(p => p.id !== id));
  };

  const clearTeam = () => {
    setTeam([]);
  };

  return (
    <TeamContext.Provider value={{ team, addToTeam, removeFromTeam, clearTeam, targetGen, setTargetGen }}>
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
