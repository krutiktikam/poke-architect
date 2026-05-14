import React from 'react';
import { Plus, Info, Crown, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Pokemon } from '../types';

interface PokemonCardProps {
  pokemon: Pokemon;
  onAdd: (pokemon: Pokemon) => void;
  isAdded: boolean;
  disabled?: boolean;
}

const typeColors: Record<string, { bg: string, text: string, glow: string }> = {
  normal: { bg: 'bg-stone-400', text: 'text-stone-50', glow: 'shadow-stone-400/20' },
  fire: { bg: 'bg-orange-500', text: 'text-orange-50', glow: 'shadow-orange-500/20' },
  water: { bg: 'bg-blue-500', text: 'text-blue-50', glow: 'shadow-blue-500/20' },
  electric: { bg: 'bg-yellow-400', text: 'text-yellow-950', glow: 'shadow-yellow-400/20' },
  grass: { bg: 'bg-green-500', text: 'text-green-50', glow: 'shadow-green-500/20' },
  ice: { bg: 'bg-cyan-300', text: 'text-cyan-900', glow: 'shadow-cyan-300/20' },
  fighting: { bg: 'bg-red-600', text: 'text-red-50', glow: 'shadow-red-600/20' },
  poison: { bg: 'bg-purple-500', text: 'text-purple-50', glow: 'shadow-purple-500/20' },
  ground: { bg: 'bg-amber-600', text: 'text-amber-50', glow: 'shadow-amber-600/20' },
  flying: { bg: 'bg-indigo-300', text: 'text-indigo-900', glow: 'shadow-indigo-300/20' },
  psychic: { bg: 'bg-pink-500', text: 'text-pink-50', glow: 'shadow-pink-500/20' },
  bug: { bg: 'bg-lime-500', text: 'text-lime-950', glow: 'shadow-lime-500/20' },
  rock: { bg: 'bg-yellow-700', text: 'text-yellow-50', glow: 'shadow-yellow-700/20' },
  ghost: { bg: 'bg-violet-700', text: 'text-violet-50', glow: 'shadow-violet-700/20' },
  dragon: { bg: 'bg-indigo-600', text: 'text-indigo-50', glow: 'shadow-indigo-600/20' },
  dark: { bg: 'bg-stone-700', text: 'text-stone-50', glow: 'shadow-stone-700/20' },
  steel: { bg: 'bg-slate-400', text: 'text-slate-50', glow: 'shadow-slate-400/20' },
  fairy: { bg: 'bg-pink-300', text: 'text-pink-900', glow: 'shadow-pink-300/20' },
};

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, onAdd, isAdded, disabled }) => {
  const isLegendary = pokemon.is_legendary || pokemon.is_mythical;
  const primaryType = pokemon.type1.toLowerCase();
  const typeStyle = typeColors[primaryType] || typeColors.normal;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className={`relative bg-white rounded-2xl shadow-sm hover:shadow-xl hover:${typeStyle.glow} transition-all duration-300 border overflow-hidden flex flex-col group ${
        isLegendary ? 'border-amber-200 ring-1 ring-amber-100/50' : 'border-slate-100'
      }`}
    >
      {/* Visual Accent for Legendary */}
      {isLegendary && (
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-transparent pointer-events-none" />
      )}

      {/* Sprite Container */}
      <div className={`p-4 flex justify-center items-center relative h-48 overflow-hidden ${
        isLegendary ? 'bg-gradient-to-br from-amber-50 to-orange-50/30' : 'bg-slate-50/50'
      }`}>
        {/* Type Background Glow */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${typeStyle.bg}`} />
        
        <motion.img 
          src={pokemon.sprite_url} 
          alt={pokemon.name} 
          whileHover={{ scale: 1.15, rotate: 2 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-40 h-40 object-contain relative z-10 drop-shadow-md"
        />
        
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <span className="text-slate-400 text-[10px] font-mono font-bold tracking-tighter opacity-50 group-hover:opacity-100 transition-opacity">
            #{String(pokemon.id).padStart(4, '0')}
          </span>
          {pokemon.generation && (
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              G{pokemon.generation}
            </span>
          )}
        </div>

        {isLegendary && (
          <div className="absolute top-3 right-3 bg-amber-400 text-white p-1.5 rounded-xl shadow-lg border border-amber-300 animate-pulse" title={pokemon.is_mythical ? 'Mythical' : 'Legendary'}>
            <Crown size={14} className="fill-current" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-5 flex flex-col flex-grow relative z-10 bg-white">
        <div className="mb-3">
          <h3 className="text-xl font-black text-slate-800 capitalize leading-tight flex items-center gap-2">
            {pokemon.name}
          </h3>
          {isLegendary && (
            <div className="flex items-center gap-1 mt-1">
              <Zap size={10} className="text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                {pokemon.is_mythical ? 'Mythical Class' : 'Legendary Class'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mb-6">
          <span className={`${typeStyle.bg} ${typeStyle.text} text-[10px] px-2.5 py-1 rounded-lg uppercase font-black tracking-wider shadow-sm`}>
            {pokemon.type1}
          </span>
          {pokemon.type2 && (
            <span className={`${typeColors[pokemon.type2.toLowerCase()]?.bg || 'bg-slate-400'} text-white text-[10px] px-2.5 py-1 rounded-lg uppercase font-black tracking-wider shadow-sm`}>
              {pokemon.type2}
            </span>
          )}
        </div>

        <div className="mt-auto grid grid-cols-[1fr_auto] gap-2">
          <button 
            onClick={() => onAdd(pokemon)}
            disabled={isAdded || (disabled && isLegendary)}
            className={`relative overflow-hidden flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
              isAdded 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
              : (disabled && isLegendary)
                ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-dashed border-slate-200'
                : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-md active:scale-95 group/btn'
            }`}
          >
            {isAdded ? (
              <span className="flex items-center gap-1.5"><Zap size={14} /> IN TEAM</span>
            ) : (disabled && isLegendary) ? (
              'LIMIT REACHED'
            ) : (
              <>
                <Plus size={18} className="group-hover/btn:rotate-90 transition-transform" /> 
                ADD TO TEAM
              </>
            )}
          </button>
          
          <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100">
            <Info size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PokemonCard;
