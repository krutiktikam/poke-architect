import React, { useState } from 'react';
import { Package } from 'lucide-react';
import type { MoveResponse, ItemResponse, AbilityResponse, Pokemon } from '../types';
import EntityList from '../components/Compendium/EntityList';

const EvolutionTree = React.lazy(() => import('../components/Compendium/EvolutionTree'));
const EncounterModal = React.lazy(() => import('../components/Compendium/EncounterModal'));
const BerryDetail = React.lazy(() => import('../components/Berries/BerryDetail'));
const ItemBagDrawer = React.lazy(() => import('../components/Items/ItemBagDrawer'));

const Compendium = () => {
  const [tab, setTab] = useState<'pokemon' | 'moves' | 'items' | 'berries' | 'abilities'>('pokemon');
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [encounterPokemon, setEncounterPokemon] = useState<Pokemon | null>(null);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [selectedItemForSlot, setSelectedItemForSlot] = useState<number | null>(null);


  const renderPokemon = (p: Pokemon) => (
    <div
      onClick={() => setSelectedPokemon(p)}
      className="flex items-center justify-between cursor-pointer"
    >
      <div className="flex items-center gap-3">
        {p.sprite_url && (
          <img src={p.sprite_url} alt={p.name} className="w-10 h-10 object-contain" />
        )}
        <div>
          <h3 className="font-bold text-gray-100 capitalize">{p.name}</h3>
          <p className="text-xs text-gray-400 capitalize">
            {p.type1}
            {p.type2 ? ` / ${p.type2}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEncounterPokemon(p);
          }}
          className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-[10px] font-bold"
        >
          Encounters
        </button>
        <span className="text-xs font-mono text-slate-500">#{p.id}</span>
      </div>
    </div>
  );

  const renderMove = (move: MoveResponse) => (
    <div>
      <h3 className="font-bold text-gray-100">{move.name}</h3>
      <p className="text-sm text-gray-400">{move.type}</p>
      {move.power !== null && (
        <p className="text-sm text-gray-400">Power: {move.power}</p>
      )}
      <p className="text-sm text-gray-400">PP: {move.pp}</p>
    </div>
  );

  const renderItem = (item: ItemResponse) => (
    <div>
      <h3 className="font-bold text-gray-100">{item.name}</h3>
      <p className="text-sm text-gray-400">{item.category}</p>
      <p className="text-sm text-gray-400">{item.effect || 'No effect'}</p>
    </div>
  );

  const renderAbility = (ability: AbilityResponse) => (
    <div>
      <h3 className="font-bold text-gray-100">{ability.name}</h3>
      <p className="text-sm text-gray-400">{ability.short_effect || 'No description'}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-indigo-400 mb-6">Pokémon Compendium</h1>

        {/* Selected Pokemon Detail View */}
        {selectedPokemon && (
          <div className="mb-8 p-6 rounded-3xl bg-gray-800/80 border border-indigo-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-4">
                {selectedPokemon.sprite_url && (
                  <img
                    src={selectedPokemon.sprite_url}
                    alt={selectedPokemon.name}
                    className="w-14 h-14 object-contain"
                  />
                )}
                <div>
                  <h2 className="text-xl font-black text-white capitalize">
                    {selectedPokemon.name}
                  </h2>
                  <p className="text-xs text-indigo-400 font-bold uppercase">
                    Species Detail & Evolution Chain
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEncounterPokemon(selectedPokemon)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                >
                  Where to catch
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPokemon(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition-colors"
                >
                  Close Detail
                </button>
              </div>
            </div>

            <React.Suspense
              fallback={
                <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                  Loading evolution lineage...
                </div>
              }
            >
              <EvolutionTree
                pokemonId={selectedPokemon.id}
                currentSpeciesId={selectedPokemon.id}
                onSelectSpecies={(_speciesId, pId) => {
                  if (pId) setSelectedPokemon((prev) => (prev ? { ...prev, id: pId } : null));
                }}
              />
            </React.Suspense>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setTab('pokemon')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              tab === 'pokemon'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Pokémon
          </button>
          <button
            onClick={() => setTab('moves')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              tab === 'moves'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Moves
          </button>
          <button
            onClick={() => setTab('items')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              tab === 'items'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Items
          </button>
          <button
            onClick={() => setTab('berries')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              tab === 'berries'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Berries & Farm
          </button>
          <button
            onClick={() => setTab('abilities')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              tab === 'abilities'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Abilities
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          {tab === 'pokemon' && (
            <EntityList<Pokemon>
              endpoint="pokemon"
              renderItem={renderPokemon}
              itemKey="id"
            />
          )}
          {tab === 'moves' && (
            <EntityList<MoveResponse>
              endpoint="moves"
              renderItem={renderMove}
              itemKey="id"
            />
          )}
          {tab === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Inventory Catalog</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemForSlot(null);
                      setIsBagOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
                  >
                    <Package size={14} /> Open Pocket Bag
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemForSlot(70);
                      setIsBagOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-bold border border-indigo-500/30 transition-all shadow-md"
                  >
                    <Package size={14} /> Select Held Item
                  </button>
                </div>
              </div>
              <EntityList<ItemResponse>
                endpoint="items"
                renderItem={renderItem}
                itemKey="id"
              />
            </div>
          )}
          {tab === 'berries' && (
            <React.Suspense
              fallback={
                <div className="p-8 text-center text-xs text-slate-400">
                  Loading Berry Planner...
                </div>
              }
            >
              <BerryDetail />
            </React.Suspense>
          )}
          {tab === 'abilities' && (
            <EntityList<AbilityResponse>
              endpoint="abilities"
              renderItem={renderAbility}
              itemKey="id"
            />
          )}
        </div>

        {/* Item Bag Drawer */}
        {isBagOpen && (
          <React.Suspense fallback={null}>
            <ItemBagDrawer
              isOpen={isBagOpen}
              onClose={() => {
                setIsBagOpen(false);
                setSelectedItemForSlot(null);
              }}
              onSelectItem={
                selectedItemForSlot !== null
                  ? (item) => {
                      setSelectedItemForSlot(item.id);
                      setIsBagOpen(false);
                    }
                  : undefined
              }
              selectedItemId={selectedItemForSlot ?? undefined}
            />
          </React.Suspense>
        )}

        {/* Encounter Modal for selected Pokemon */}
        {encounterPokemon && (
          <React.Suspense fallback={null}>
            <EncounterModal
              isOpen={Boolean(encounterPokemon)}
              onClose={() => setEncounterPokemon(null)}
              pokemonId={encounterPokemon.id}
              pokemonName={encounterPokemon.name}
              pokemonSprite={encounterPokemon.sprite_url}
            />
          </React.Suspense>
        )}
      </div>
    </div>
  );
};

export default Compendium;