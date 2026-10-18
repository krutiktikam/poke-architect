import React, { useState, useEffect } from 'react';
import type { Pokemon } from '../types';
import { TeamContext } from './TeamContext.types';
import type { TeamMember, TeamContextType } from './TeamContext.types';
export type { TeamMember, TeamContextType };

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [team, setTeam] = useState<TeamMember[]>(() => {
    try {
      const savedTeam = typeof localStorage !== 'undefined' ? localStorage.getItem('poke-team') : null;
      if (savedTeam) {
        const parsed: TeamMember[] = JSON.parse(savedTeam);
        parsed.forEach((member) => {
          if (!member.selectedMoves) member.selectedMoves = [null, null, null, null];
          else {
            while (member.selectedMoves.length < 4) member.selectedMoves.push(null);
            if (member.selectedMoves.length > 4) member.selectedMoves.length = 4;
          }
        });
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved team', e);
    }
    return [];
  });

  const [targetGen, setTargetGen] = useState<number>(() => {
    try {
      const savedGen = typeof localStorage !== 'undefined' ? localStorage.getItem('poke-target-gen') : null;
      if (savedGen) {
        const parsed = parseInt(savedGen, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return 9;
  });

  useEffect(() => {
    // Prepare team for saving: ensure selectedMoves arrays exist
    const toSave = team.map(member => ({
      ...member,
      selectedMoves: member.selectedMoves ?? [null, null, null, null]
    }));
    localStorage.setItem('poke-team', JSON.stringify(toSave));
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

      // Initialize selection slots
      const newMember: TeamMember = {
        ...pokemon,
        selectedMoves: [null, null, null, null],
        selectedItem: null,
        selectedAbility: null,
        selectedNature: null
      };
      return [...prev, newMember];
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

      // Preserve selections from the old pokemon if any
      const oldMember = prev.find(p => p.id === oldPokemonId);
      const newMember: TeamMember = {
        ...newPokemon,
        selectedMoves: oldMember?.selectedMoves ?? [null, null, null, null],
        selectedItem: oldMember?.selectedItem ?? null,
        selectedAbility: oldMember?.selectedAbility ?? null,
        selectedNature: oldMember?.selectedNature ?? null
      };

      return prev.map(p => p.id === oldPokemonId ? newMember : p);
    });
  };

  const clearTeam = () => {
    setTeam([]);
  };

  const loadTeam = (newTeam: TeamMember[]) => {
    setTeam(newTeam);
  };

  const updateTeamMember = (pokemonId: number, updates: Partial<TeamMember>) => {
    setTeam(prev => {
      return prev.map(member => {
        if (member.id === pokemonId) {
          // Merge updates, ensuring arrays are handled correctly
          const updated = { ...member, ...updates };
          // Ensure selectedMoves is array of length 4 if provided
          if (updated.selectedMoves !== undefined) {
            // Ensure length 4
            const moves = updated.selectedMoves;
            while (moves.length < 4) moves.push(null);
            if (moves.length > 4) moves.length = 4;
            updated.selectedMoves = moves;
          }
          return updated;
        }
        return member;
      });
    });
  };

  return (
    <TeamContext.Provider value={{
      team,
      addToTeam,
      removeFromTeam,
      replaceInTeam,
      clearTeam,
      loadTeam,
      targetGen,
      setTargetGen,
      updateTeamMember
    }}>
      {children}
    </TeamContext.Provider>
  );
};