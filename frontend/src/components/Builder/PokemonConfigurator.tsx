import React, { useState, Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { useTeam } from '../../context/useTeam';
import type { TeamMember } from '../../context/TeamContext';
import { useVersion } from '../../context/useVersion';
import { useLearnset } from '../../api/learnsets';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const ItemBagDrawer = React.lazy(() => import('../Items/ItemBagDrawer'));

interface PokemonConfiguratorProps {
  pokemon: TeamMember;
}

const PokemonConfigurator = ({ pokemon }: PokemonConfiguratorProps) => {
  const { updateTeamMember } = useTeam();
  const { selectedVersion } = useVersion();
  const [isBagOpen, setIsBagOpen] = useState(false);

  const versionGroupIdentifier = selectedVersion?.version_group_identifier ?? null;
  const isGameSelected = Boolean(selectedVersion && versionGroupIdentifier);

  // Learnset query for the selected game
  const {
    data: learnsetData,
    isLoading: learnsetIsLoading,
    isError: learnsetIsError,
  } = useLearnset(pokemon.id, versionGroupIdentifier);

  // Fetch data for dropdowns
  const { data: movesData, isLoading: movesLoading } = useQuery<
    Array<{ id: number; name: string }>
  >({
    queryKey: ['moves'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/moves`, {
        params: { limit: 1000 }
      });
      return res.data;
    }
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery<
    Array<{ id: number; name: string }>
  >({
    queryKey: ['items', 'holdable'],
    queryFn: async () => {
      const requestUrl = API_BASE_URL.endsWith('/api')
        ? `${API_BASE_URL.replace(/\/api$/, '')}/api/items?holdable=true&sort=name&limit=300`
        : `${API_BASE_URL}/api/items?holdable=true&sort=name&limit=300`;
      const res = await axios.get<Array<{ id: number; name: string }>>(requestUrl);
      return res.data;
    }
  });

  const { data: abilitiesData, isLoading: abilitiesLoading } = useQuery<
    Array<{ id: number; name: string }>
  >({
    queryKey: ['abilities'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/abilities`, {
        params: { limit: 1000 }
      });
      return res.data;
    }
  });

  const { data: naturesData, isLoading: naturesLoading } = useQuery<
    Array<{ id: number; name: string }>
  >({
    queryKey: ['natures'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/natures`, {
        params: { limit: 1000 }
      });
      return res.data;
    }
  });

  // Grouped and de-duplicated learnset moves
  const groupedLearnset = useMemo(() => {
    if (!isGameSelected || !learnsetData?.moves || learnsetData.moves.length === 0) {
      return null;
    }

    const seen = new Set<number>();
    const groups: Array<{ label: string; moves: Array<{ id: number; label: string }> }> = [];

    const methodCategories = [
      { key: 'level-up', label: 'Level-up' },
      { key: 'machine', label: 'Machine' },
      { key: 'egg', label: 'Egg' },
      { key: 'tutor', label: 'Tutor' },
      { key: 'other', label: 'Other' },
    ];

    for (const cat of methodCategories) {
      const catMoves: Array<{ id: number; label: string }> = [];
      for (const item of learnsetData.moves) {
        const itemCat = ['level-up', 'machine', 'egg', 'tutor'].includes(item.method)
          ? item.method
          : 'other';

        if (itemCat === cat.key && !seen.has(item.move.id)) {
          seen.add(item.move.id);
          catMoves.push({
            id: item.move.id,
            label: cat.key === 'level-up' ? `Lv ${item.level} ${item.move.name}` : item.move.name,
          });
        }
      }
      if (catMoves.length > 0) {
        groups.push({ label: cat.label, moves: catMoves });
      }
    }

    return { groups, moveIds: seen };
  }, [isGameSelected, learnsetData]);

  // Helper to render a select dropdown
  const renderSelect = (
    label: string,
    options: Array<{ id: number; name: string }> | undefined,
    value: number | null | undefined,
    onChange: (id: number | null) => void,
    placeholder: string = 'None'
  ) => {
    if (!options) return <div className="text-gray-400 italic">Loading...</div>;

    return (
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <select
          value={value ?? ''}
          onChange={(e) => {
            const id = e.target.value ? parseInt(e.target.value, 10) : null;
            onChange(id);
          }}
          className="w-full px-3 py-2 bg-gray-800/50 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">--- {placeholder} ---</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Helper for multi-select moves (4 slots)
  const renderMoveSlots = () => {
    if (!movesData) return <div className="text-gray-400 italic">Loading moves...</div>;

    const moves = pokemon.selectedMoves ?? [null, null, null, null];
    const gameName = selectedVersion?.name ?? 'selected game';

    // Determine one-line hint text
    let hintText: string | null = null;
    if (!isGameSelected) {
      hintText = 'Select a game in the header to see only learnable moves';
    } else if (learnsetIsLoading) {
      hintText = `Loading learnset for ${gameName}... Showing all moves`;
    } else if (learnsetIsError) {
      hintText = `Could not load learnset for ${gameName}. Showing all moves`;
    } else if (learnsetData && learnsetData.moves.length === 0) {
      hintText = `No learnset available for ${gameName}. Showing all moves`;
    }

    return (
      <div className="space-y-2">
        <div className="mb-1">
          <label className="block text-sm font-medium text-gray-300">Moves (4)</label>
          {hintText && (
            <p className="text-xs text-slate-400 mt-0.5">{hintText}</p>
          )}
        </div>
        {moves.map((moveId, index) => {
          const isIllegal =
            groupedLearnset !== null &&
            moveId !== null &&
            !groupedLearnset.moveIds.has(moveId);

          const illegalMoveName = isIllegal
            ? movesData.find((m) => m.id === moveId)?.name ?? `Move ${moveId}`
            : null;

          return (
            <div key={index} className="flex items-center space-x-2">
              <span className="w-8 text-center text-xs text-gray-400">#{index + 1}</span>
              <select
                value={moveId ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? parseInt(e.target.value, 10) : null;
                  const newMoves = [...moves];
                  newMoves[index] = id;
                  updateTeamMember(pokemon.id, { selectedMoves: newMoves });
                }}
                className="flex-1 px-3 py-2 bg-gray-800/50 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">--- None ---</option>
                {isIllegal && moveId !== null && (
                  <option value={moveId}>
                    {`⚠ ${illegalMoveName} (not learnable in ${gameName})`}
                  </option>
                )}
                {groupedLearnset ? (
                  groupedLearnset.groups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.moves.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))
                ) : (
                  movesData.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          );
        })}
      </div>
    );
  };

  if (movesLoading || itemsLoading || abilitiesLoading || naturesLoading) {
    return (
      <div className="p-4 bg-gray-800/50 rounded-lg">
        <div className="flex flex-col items-center justify-center py-8">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></span>
          <p className="mt-2 text-gray-400">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h3 className="text-lg font-bold text-indigo-400 mb-4">
        Configure {pokemon.name}
      </h3>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">Held Item</span>
        <button
          type="button"
          onClick={() => setIsBagOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-colors"
        >
          <Package size={13} /> Open Bag
        </button>
      </div>
      {renderSelect(
        '',
        itemsData,
        pokemon.selectedItem ?? null,
        (id) => updateTeamMember(pokemon.id, { selectedItem: id }),
        'No Item'
      )}
      {renderSelect(
        'Ability',
        abilitiesData,
        pokemon.selectedAbility ?? null,
        (id) => updateTeamMember(pokemon.id, { selectedAbility: id }),
        'No Ability'
      )}
      {renderSelect(
        'Nature',
        naturesData,
        pokemon.selectedNature ?? null,
        (id) => updateTeamMember(pokemon.id, { selectedNature: id }),
        'No Nature'
      )}
      {renderMoveSlots()}

      {isBagOpen && (
        <Suspense fallback={null}>
          <ItemBagDrawer
            isOpen={isBagOpen}
            onClose={() => setIsBagOpen(false)}
            selectedItemId={pokemon.selectedItem ?? null}
            onSelectItem={(item) => updateTeamMember(pokemon.id, { selectedItem: item.id })}
          />
        </Suspense>
      )}
    </div>
  );
};

export default PokemonConfigurator;
