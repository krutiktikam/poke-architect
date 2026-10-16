import { useState } from 'react';
import type { MoveResponse, ItemResponse, AbilityResponse } from '../types';
import EntityList from '../components/Compendium/EntityList';

const Compendium = () => {
  const [tab, setTab] = useState<'moves' | 'items' | 'abilities'>('moves');

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

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setTab('moves')}
            className={`px-4 py-2 rounded-t-lg ${tab === 'moves' ? 'bg-indigo-600 text-white' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'}`}
          >
            Moves
          </button>
          <button
            onClick={() => setTab('items')}
            className={`px-4 py-2 rounded-t-lg ${tab === 'items' ? 'bg-indigo-600 text-white' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'}`}
          >
            Items
          </button>
          <button
            onClick={() => setTab('abilities')}
            className={`px-4 py-2 rounded-t-lg ${tab === 'abilities' ? 'bg-indigo-600 text-white' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'}`}
          >
            Abilities
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          {tab === 'moves' && (
            <EntityList<MoveResponse>
              endpoint="moves"
              renderItem={renderMove}
              itemKey="id"
            />
          )}
          {tab === 'items' && (
            <EntityList<ItemResponse>
              endpoint="items"
              renderItem={renderItem}
              itemKey="id"
            />
          )}
          {tab === 'abilities' && (
            <EntityList<AbilityResponse>
              endpoint="abilities"
              renderItem={renderAbility}
              itemKey="id"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Compendium;