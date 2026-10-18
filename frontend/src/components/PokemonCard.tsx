import React, { useState, Suspense } from 'react';
import { Plus, Info, Crown, Settings2, Check, X, MapPin, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Sheet } from './ui/Sheet';
import type { Pokemon } from '../types';

const EncounterModal = React.lazy(() => import('./Compendium/EncounterModal'));
const EvolutionTree = React.lazy(() => import('./Compendium/EvolutionTree'));
const ItemBagDrawer = React.lazy(() => import('./Items/ItemBagDrawer'));


interface LoadoutConfig {
  itemId: number | null;
  abilityId: number | null;
  natureId: number | null;
  moveIds: (number | null)[];
}

interface PokemonCardProps {
  pokemon: Pokemon;
  onAdd: (pokemon: Pokemon, config?: LoadoutConfig) => void;
  isAdded: boolean;
  disabled?: boolean;
}

const typeColors: Record<string, { bg: string; text: string; glow: string }> = {
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, onAdd, isAdded, disabled }) => {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedAbilityId, setSelectedAbilityId] = useState<number | null>(null);
  const [selectedNatureId, setSelectedNatureId] = useState<number | null>(null);
  const [selectedMoveIds, setSelectedMoveIds] = useState<(number | null)[]>([null, null, null, null]);
  const [isEncounterOpen, setIsEncounterOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBagOpen, setIsBagOpen] = useState(false);

  const isLegendary = pokemon.is_legendary || pokemon.is_mythical;
  const primaryType = pokemon.type1.toLowerCase();
  const typeStyle = typeColors[primaryType] || typeColors.normal;

  // React Query cached fetches for compendium dropdowns
  const { data: itemsData } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ['items-list'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/items`, { params: { limit: 500 } });
      return res.data;
    },
    enabled: isConfiguring,
  });

  const { data: abilitiesData } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ['abilities-list'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/abilities`, { params: { limit: 500 } });
      return res.data;
    },
    enabled: isConfiguring,
  });

  const { data: naturesData } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ['natures-list'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/natures`, { params: { limit: 100 } });
      return res.data;
    },
    enabled: isConfiguring,
  });

  const { data: movesData } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ['moves-list'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/moves`, { params: { limit: 1000 } });
      return res.data;
    },
    enabled: isConfiguring,
  });

  const handleConfirmConfig = () => {
    onAdd(pokemon, {
      itemId: selectedItemId,
      abilityId: selectedAbilityId,
      natureId: selectedNatureId,
      moveIds: selectedMoveIds,
    });
    setIsConfiguring(false);
  };

  const renderSelect = (
    label: string,
    options: Array<{ id: number; name: string }> | undefined,
    value: number | null,
    onChange: (id: number | null) => void,
    placeholder: string = 'None'
  ) => (
    <div className="mb-2">
      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
        className="w-full px-2.5 py-1.5 bg-slate-900/80 text-white text-xs rounded-xl border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize"
      >
        <option value="">-- {placeholder} --</option>
        {options?.map((opt) => (
          <option key={opt.id} value={opt.id} className="bg-slate-900 text-white capitalize">
            {opt.name.replace('-', ' ')}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`relative glass-card rounded-[32px] overflow-hidden flex flex-col group ${
        isLegendary ? 'ring-1 ring-amber-500/20' : 'ring-1 ring-white/5'
      }`}
    >
      {/* Sprite Header Container */}
      <div className="p-6 flex justify-center items-center relative h-40 overflow-hidden bg-white/[0.01]">
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 ${typeStyle.bg}`} />

        <motion.img
          src={pokemon.sprite_url}
          alt={pokemon.name}
          whileHover={{ scale: 1.1, rotate: 3 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-28 h-28 object-contain relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] group-hover:drop-shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all"
        />

        <div className="absolute top-4 left-4 flex flex-col gap-0.5 z-10">
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
          <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-500 p-1.5 rounded-xl border border-amber-500/20 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.2)] z-10">
            <Crown size={12} className="fill-current" />
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="p-5 flex flex-col flex-grow relative z-10 bg-transparent">
        <div className="mb-3">
          <h3 className="text-lg font-black text-white capitalize leading-tight mb-1 group-hover:text-indigo-300 transition-colors flex items-center justify-between">
            {pokemon.name}
            {pokemon.tier && pokemon.tier !== 'N/A' && (
              <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-black">
                {pokemon.tier}
              </span>
            )}
          </h3>
          <div className="flex gap-1.5">
            <span className="text-[8px] px-2 py-0.5 rounded-md uppercase font-black tracking-widest bg-white/5 border border-white/5 text-slate-400 group-hover:text-white transition-colors">
              {pokemon.type1}
            </span>
            {pokemon.type2 && (
              <span className="text-[8px] px-2 py-0.5 rounded-md uppercase font-black tracking-widest bg-white/5 border border-white/5 text-slate-400 group-hover:text-white transition-colors">
                {pokemon.type2}
              </span>
            )}
          </div>
        </div>

        {/* Inline Configurator Overlay Panel */}
        <AnimatePresence>
          {isConfiguring && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="my-3 p-3 bg-slate-950/80 rounded-2xl border border-indigo-500/30 space-y-2 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Loadout Config</span>
                <button onClick={() => setIsConfiguring(false)} className="text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Held Item</span>
                <button
                  type="button"
                  onClick={() => setIsBagOpen(true)}
                  className="flex items-center gap-1 text-[9px] font-bold text-indigo-400 hover:text-indigo-300"
                >
                  <Package size={11} /> Open Bag
                </button>
              </div>
              {renderSelect('', itemsData, selectedItemId, setSelectedItemId, 'Select Item')}

              {renderSelect('Ability', abilitiesData, selectedAbilityId, setSelectedAbilityId, 'Select Ability')}
              {renderSelect('Nature', naturesData, selectedNatureId, setSelectedNatureId, 'Select Nature')}

              <div className="space-y-1 mt-2">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Moves (Max 4)</label>
                {selectedMoveIds.map((moveId, idx) => (
                  <select
                    key={idx}
                    value={moveId ?? ''}
                    onChange={(e) => {
                      const newMoves = [...selectedMoveIds];
                      newMoves[idx] = e.target.value ? parseInt(e.target.value, 10) : null;
                      setSelectedMoveIds(newMoves);
                    }}
                    className="w-full px-2 py-1 bg-slate-900/80 text-white text-xs rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize mb-1"
                  >
                    <option value="">-- Move Slot {idx + 1} --</option>
                    {movesData?.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-white capitalize">
                        {m.name.replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                ))}
              </div>

              <button
                onClick={handleConfirmConfig}
                className="w-full mt-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black tracking-widest uppercase rounded-xl flex items-center justify-center gap-1 shadow-md transition-all"
              >
                <Check size={12} /> Confirm & Initialize
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Controls */}
        <div className="mt-auto flex gap-2">
          {!isConfiguring && (
            <>
              <button
                onClick={() => {
                  if (!isAdded && !(disabled && isLegendary)) {
                    onAdd(pokemon, {
                      itemId: selectedItemId,
                      abilityId: selectedAbilityId,
                      natureId: selectedNatureId,
                      moveIds: selectedMoveIds,
                    });
                  }
                }}
                disabled={isAdded || (disabled && isLegendary)}
                className={`flex-grow flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all duration-300 overflow-hidden relative ${
                  isAdded
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : disabled && isLegendary
                    ? 'bg-white/5 text-white/10 cursor-not-allowed border border-dashed border-white/10'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 group/btn'
                }`}
              >
                {isAdded ? (
                  'IN ROSTER'
                ) : disabled && isLegendary ? (
                  'LIMIT REACHED'
                ) : (
                  <>
                    <Plus size={14} className="group-hover/btn:rotate-90 transition-transform" />
                    INITIALIZE
                  </>
                )}
              </button>

              {!isAdded && !(disabled && isLegendary) && (
                <button
                  onClick={() => setIsConfiguring(true)}
                  title="Configure Loadout"
                  className="p-3 bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-300 text-white/40 rounded-2xl transition-all border border-white/5"
                >
                  <Settings2 size={16} />
                </button>
              )}
            </>
          )}

          {/* Where to catch button */}
          <button
            type="button"
            onClick={() => setIsEncounterOpen(true)}
            title="Where to catch"
            aria-label={`Where to catch ${pokemon.name}`}
            className="p-3 bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-300 text-white/40 rounded-2xl transition-all border border-white/5"
          >
            <MapPin size={16} />
          </button>

          {/* Details / Evolution tree button */}
          <button
            type="button"
            onClick={() => setIsDetailOpen(true)}
            title="Species Details & Evolution"
            aria-label={`Details and evolution tree for ${pokemon.name}`}
            className="p-3 bg-white/5 hover:bg-white/10 text-white/30 hover:text-white rounded-2xl transition-all border border-white/5 group/info"
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* Lazy Encounter Modal */}
      {isEncounterOpen && (
        <Suspense fallback={null}>
          <EncounterModal
            isOpen={isEncounterOpen}
            onClose={() => setIsEncounterOpen(false)}
            pokemonId={pokemon.id}
            pokemonName={pokemon.name}
            pokemonSprite={pokemon.sprite_url}
          />
        </Suspense>
      )}

      {/* Lazy Evolution Tree Sheet */}
      {isDetailOpen && (
        <Sheet
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`${pokemon.name} - Evolution & Species`}
          description={`Comprehensive species hierarchy and evolution branches for ${pokemon.name}.`}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <img
                src={pokemon.sprite_url}
                alt={pokemon.name}
                className="w-16 h-16 object-contain drop-shadow"
              />
              <div>
                <h4 className="text-base font-black text-white capitalize">{pokemon.name}</h4>
                <div className="flex gap-1.5 mt-1">
                  <span className="text-[9px] px-2 py-0.5 rounded uppercase font-black bg-white/5 text-slate-300">
                    {pokemon.type1}
                  </span>
                  {pokemon.type2 && (
                    <span className="text-[9px] px-2 py-0.5 rounded uppercase font-black bg-white/5 text-slate-300">
                      {pokemon.type2}
                    </span>
                  )}
                  {pokemon.generation && (
                    <span className="text-[9px] px-2 py-0.5 rounded font-bold text-indigo-400">
                      Gen {pokemon.generation}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Suspense
              fallback={
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading evolution lineage...
                </div>
              }
            >
              <EvolutionTree pokemonId={pokemon.id} currentSpeciesId={pokemon.id} />
            </Suspense>
          </div>
        </Sheet>
      )}

      {/* Lazy Item Bag Drawer */}
      {isBagOpen && (
        <Suspense fallback={null}>
          <ItemBagDrawer
            isOpen={isBagOpen}
            onClose={() => setIsBagOpen(false)}
            selectedItemId={selectedItemId}
            onSelectItem={(item) => setSelectedItemId(item.id)}
          />
        </Suspense>
      )}
    </motion.div>
  );
};

export default PokemonCard;