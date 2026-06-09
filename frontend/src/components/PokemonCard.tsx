import React from 'react';
import { Plus, Info, Crown } from 'lucide-react';
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className={`relative glass-card rounded-[32px] overflow-hidden flex flex-col group ${
        isLegendary ? 'ring-1 ring-amber-500/20' : 'ring-1 ring-white/5'
      }`}
    >
      {/* Sprite Container */}
      <div className={`p-6 flex justify-center items-center relative h-44 overflow-hidden bg-white/[0.01]`}>
        {/* Type Background Glow (Hover) */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 ${typeStyle.bg}`} />
        
        <motion.img 
          src={pokemon.sprite_url} 
          alt={pokemon.name} 
          whileHover={{ scale: 1.1, rotate: 3 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-32 h-32 object-contain relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] group-hover:drop-shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all"
        />
        
        <div className="absolute top-4 left-4 flex flex-col gap-0.5">
          <span className="text-white/20 text-[9px] font-black tracking-[0.2em]">
            #{String(pokemon.id).padStart(4, '0')}
          </span>
          {pokemon.generation && (
            <span className="text-[8px] font-black text-indigo-500/50 uppercase tracking-[0.2em]">
              GEN {pokemon.generation}
            </span>
          )}
        </div>

        {isLegendary && (
          <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-500 p-1.5 rounded-xl border border-amber-500/20 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Crown size={12} className="fill-current" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-5 flex flex-col flex-grow relative z-10 bg-transparent">
        <div className="mb-4">
          <h3 className="text-lg font-black text-white capitalize leading-tight mb-1 group-hover:text-indigo-300 transition-colors flex items-center justify-between">
            {pokemon.name}
            {pokemon.tier && pokemon.tier !== 'N/A' && (
              <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-black">
                {pokemon.tier}
              </span>
            )}
          </h3>
          <div className="flex gap-1.5">
            <span className={`text-[8px] px-2 py-0.5 rounded-md uppercase font-black tracking-widest bg-white/5 border border-white/5 text-slate-400 group-hover:text-white transition-colors`}>
              {pokemon.type1}
            </span>
            {pokemon.type2 && (
              <span className={`text-[8px] px-2 py-0.5 rounded-md uppercase font-black tracking-widest bg-white/5 border border-white/5 text-slate-400 group-hover:text-white transition-colors`}>
                {pokemon.type2}
              </span>
            )}
          </div>
        </div>

        <div className="mt-auto flex gap-2">
          <button 
            onClick={() => onAdd(pokemon)}
            disabled={isAdded || (disabled && isLegendary)}
            className={`flex-grow flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all duration-300 overflow-hidden relative ${
              isAdded 
              ? 'bg-white/5 text-white/20 cursor-not-allowed' 
              : (disabled && isLegendary)
                ? 'bg-white/5 text-white/10 cursor-not-allowed border border-dashed border-white/10'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 group/btn'
            }`}
          >
            {isAdded ? (
              'IN ROSTER'
            ) : (disabled && isLegendary) ? (
              'LIMIT REACHED'
            ) : (
              <>
                <Plus size={14} className="group-hover/btn:rotate-90 transition-transform" /> 
                INITIALIZE
              </>
            )}
            
            {!isAdded && !(disabled && isLegendary) && (
              <motion.div 
                className="absolute inset-0 bg-white/10 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 skew-x-12"
              />
            )}
          </button>
          
          <button className="p-3 bg-white/5 hover:bg-white/10 text-white/30 hover:text-white rounded-2xl transition-all border border-white/5 group/info">
            <Info size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PokemonCard;
