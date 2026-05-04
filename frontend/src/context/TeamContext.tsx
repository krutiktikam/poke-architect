import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Pokemon } from '../types';

interface TeamContextType {
  team: Pokemon[];
  addToTeam: (pokemon: Pokemon) => void;
  removeFromTeam: (id: number) => void;
  replaceInTeam: (newPokemon: Pokemon, oldPokemonId: number) => void;
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
    setTeam(prev => {
      if (prev.length >= 6) return prev;
      if (prev.find(p => p.id === pokemon.id)) return prev;
      
      // Constraint: Only one legendary/mythical per team
      const isNewLegendary = pokemon.is_legendary || pokemon.is_mythical;
      const hasLegendary = prev.some(p => p.is_legendary || p.is_mythical);
      
      if (isNewLegendary && hasLegendary) {
        alert('Strategic Constraint: Only one Legendary or Mythical Pokémon is allowed per team to maintain competitive balance.');
        return prev;
      }

      return [...prev, pokemon];
    });
  };

  const removeFromTeam = (id: number) => {
    setTeam(prev => prev.filter(p => p.id !== id));
  };

  const replaceInTeam = (newPokemon: Pokemon, oldPokemonId: number) => {
    setTeam(prev => {
      // 1. Check if new pokemon is already in team (other than the one being replaced)
      if (prev.some(p => p.id === newPokemon.id && p.id !== oldPokemonId)) {
        return prev;
      }

      // 2. Legendary constraint check
      const isNewLegendary = newPokemon.is_legendary || newPokemon.is_mythical;
      const otherLegendary = prev.find(p => (p.is_legendary || p.is_mythical) && p.id !== oldPokemonId);
      
      if (isNewLegendary && otherLegendary) {
        alert('Strategic Constraint: Only one Legendary or Mythical Pokémon is allowed per team.');
        return prev;
      }

      return prev.map(p => p.id === oldPokemonId ? newPokemon : p);
    });
  };

  const clearTeam = () => {
    setTeam([]);
  };

  const loadTeam = (newTeam: Pokemon[]) => {
    setTeam(newTeam);
  };

  return (
    <TeamContext.Provider value={{ team, addToTeam, removeFromTeam, replaceInTeam, clearTeam, loadTeam, targetGen, setTargetGen }}>
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
