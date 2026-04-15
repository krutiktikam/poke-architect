import React from 'react';
import { Plus, Info } from 'lucide-react';
import type { Pokemon } from '../types';

interface PokemonCardProps {
  pokemon: Pokemon;
  onAdd: (pokemon: Pokemon) => void;
  isAdded: boolean;
}

const typeColors: Record<string, string> = {
  normal: 'bg-stone-400',
  fire: 'bg-orange-500',
  water: 'bg-blue-500',
  electric: 'bg-yellow-400',
  grass: 'bg-green-500',
  ice: 'bg-cyan-300',
  fighting: 'bg-red-600',
  poison: 'bg-purple-500',
  ground: 'bg-amber-600',
  flying: 'bg-indigo-300',
  psychic: 'bg-pink-500',
  bug: 'bg-lime-500',
  rock: 'bg-yellow-700',
  ghost: 'bg-violet-700',
  dragon: 'bg-indigo-600',
  dark: 'bg-stone-700',
  steel: 'bg-slate-400',
  fairy: 'bg-pink-300',
};

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, onAdd, isAdded }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 overflow-hidden flex flex-col group">
      <div className="bg-slate-50 p-4 flex justify-center items-center relative h-48">
        <img 
          src={pokemon.sprite_url} 
          alt={pokemon.name} 
          className="w-40 h-40 object-contain group-hover:scale-110 transition-transform duration-300"
        />
        <span className="absolute top-2 left-2 text-slate-400 text-xs font-mono">
          #{String(pokemon.id).padStart(3, '0')}
        </span>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-slate-800 capitalize mb-2">{pokemon.name}</h3>
        
        <div className="flex gap-2 mb-4">
          <span className={`${typeColors[pokemon.type1] || 'bg-slate-400'} text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider`}>
            {pokemon.type1}
          </span>
          {pokemon.type2 && (
            <span className={`${typeColors[pokemon.type2] || 'bg-slate-400'} text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider`}>
              {pokemon.type2}
            </span>
          )}
        </div>

        <div className="mt-auto flex justify-between items-center gap-2">
          <button 
            onClick={() => onAdd(pokemon)}
            disabled={isAdded}
            className={`flex-grow flex items-center justify-center gap-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
              isAdded 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-yellow-400 text-slate-900 hover:bg-yellow-500'
            }`}
          >
            <Plus size={16} />
            {isAdded ? 'In Team' : 'Add to Team'}
          </button>
          
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Info size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PokemonCard;
