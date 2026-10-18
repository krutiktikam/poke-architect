import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { useVersion } from '../../context/useVersion';
import { GameVersionSelector } from '../Header/GameVersionSelector';
import { encountersQueryOptions, type LocationEncountersResponse, type EncounterDetailSchema } from '../../api/queries';
import { getMethodIcon } from './EncounterModal.utils';


export interface EncounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  pokemonId: number;
  pokemonName: string;
  pokemonSprite?: string | null;
}

/**
 * EncounterModal Component
 */
export const EncounterModal: React.FC<EncounterModalProps> = ({
  isOpen,
  onClose,
  pokemonId,
  pokemonName,
  pokemonSprite,
}) => {
  const { selectedVersionId, selectedVersion, setSelectedVersionId } = useVersion();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [collapsedRegions, setCollapsedRegions] = useState<Record<string, boolean>>({});

  const { data, isPending, isError, error } = useQuery(
    encountersQueryOptions(pokemonId, selectedVersionId)
  );

  // Extract all distinct encounter methods for filter chips
  const availableMethods = useMemo(() => {
    if (!data) return [];
    const methodsMap = new Map<string, string>();
    data.forEach((loc) => {
      loc.areas?.forEach((area) => {
        area.encounters?.forEach((enc) => {
          if (enc.method?.identifier) {
            methodsMap.set(enc.method.identifier, enc.method.name || enc.method.identifier);
          }
        });
      });
    });
    return Array.from(methodsMap.entries()).map(([identifier, name]) => ({ identifier, name }));
  }, [data]);

  // Group by Region -> Location -> Area with filtering
  const groupedData = useMemo(() => {
    if (!data) return [];

    const normSearch = searchTerm.trim().toLowerCase();

    // Map: regionName -> locations
    const regionMap = new Map<
      string,
      {
        regionName: string;
        locations: {
          location: LocationEncountersResponse;
          filteredAreas: {
            areaName: string;
            encounters: EncounterDetailSchema[];
          }[];
        }[];
      }
    >();

    data.forEach((loc) => {
      const regionName = loc.region?.name || 'Other Regions';

      const filteredAreas = (loc.areas || [])
        .map((area) => {
          const areaName = area.name || loc.name || 'Main Area';
          const matchesSearch =
            !normSearch ||
            (loc.name && loc.name.toLowerCase().includes(normSearch)) ||
            (area.name && area.name.toLowerCase().includes(normSearch)) ||
            (loc.region?.name && loc.region.name.toLowerCase().includes(normSearch));

          if (!matchesSearch) return null;

          const filteredEncounters = (area.encounters || []).filter((enc) => {
            if (selectedMethod !== 'all' && enc.method?.identifier !== selectedMethod) {
              return false;
            }
            return true;
          });

          if (filteredEncounters.length === 0) return null;

          return {
            areaName,
            encounters: filteredEncounters,
          };
        })
        .filter((a): a is { areaName: string; encounters: EncounterDetailSchema[] } => a !== null);

      if (filteredAreas.length > 0) {
        if (!regionMap.has(regionName)) {
          regionMap.set(regionName, { regionName, locations: [] });
        }
        regionMap.get(regionName)!.locations.push({
          location: loc,
          filteredAreas,
        });
      }
    });

    return Array.from(regionMap.values());
  }, [data, searchTerm, selectedMethod]);

  const toggleRegion = (regionName: string) => {
    setCollapsedRegions((prev) => ({
      ...prev,
      [regionName]: !prev[regionName],
    }));
  };

  const totalFilteredCount = groupedData.reduce(
    (acc, reg) =>
      acc +
      reg.locations.reduce(
        (lAcc, loc) => lAcc + loc.filteredAreas.reduce((aAcc, a) => aAcc + a.encounters.length, 0),
        0
      ),
    0
  );

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Where to catch ${pokemonName}`}
      description={`Wild encounter habitats, catch rates, and obtainability for ${pokemonName}.`}
    >
      <div className="space-y-6">
        {/* Header with Pokemon Overview & In-Modal Version Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-3">
            {pokemonSprite && (
              <img
                src={pokemonSprite}
                alt={pokemonName}
                className="w-12 h-12 object-contain drop-shadow"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-indigo-400" />
                <h3 className="text-sm font-black text-white capitalize">{pokemonName}</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                {selectedVersion ? `Viewing ${selectedVersion.name}` : 'Viewing All Games'}
              </p>
            </div>
          </div>

          {/* In-Modal Shortcut to Game Version Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
              Game:
            </span>
            <GameVersionSelector />
          </div>
        </div>

        {/* Filter Bar: Search Input & Method Chips */}
        <div className="space-y-3">
          {/* Location Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search locations or routes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search locations"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Method Filter Chips */}
          {availableMethods.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedMethod('all')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 ${
                  selectedMethod === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                All Methods
              </button>
              {availableMethods.map((m) => {
                const Icon = getMethodIcon(m.identifier);
                const isSelected = selectedMethod === m.identifier;
                return (
                  <button
                    key={m.identifier}
                    type="button"
                    onClick={() => setSelectedMethod(m.identifier)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon size={12} />
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Encounter Content List */}
        {isPending ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3" aria-busy="true">
            <span className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs font-bold text-slate-400">Consulting regional habitat registers...</p>
          </div>
        ) : isError ? (
          <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-center">
            <AlertCircle size={28} className="mx-auto text-rose-400 mb-2" />
            <p className="text-xs font-bold text-rose-300">
              {error?.message || 'Failed to retrieve encounter data.'}
            </p>
          </div>
        ) : totalFilteredCount === 0 ? (
          /* Empty State */
          <div className="py-12 px-6 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 text-center">
            <MapPin size={36} className="mx-auto text-slate-600 mb-3" />
            <h4 className="text-sm font-bold text-white mb-1">
              Not found in the wild in this game
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Try selecting another game version or switch to All Games to see where {pokemonName}{' '}
              can be caught.
            </p>
            {selectedVersionId !== null && (
              <button
                type="button"
                onClick={() => setSelectedVersionId(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles size={14} /> View All Games
              </button>
            )}
          </div>
        ) : (
          /* Grouped Accordion / List */
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            {groupedData.map((reg) => {
              const isCollapsed = Boolean(collapsedRegions[reg.regionName]);
              const regEncCount = reg.locations.reduce(
                (acc, l) => acc + l.filteredAreas.reduce((aAcc, a) => aAcc + a.encounters.length, 0),
                0
              );

              return (
                <div
                  key={reg.regionName}
                  className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden"
                >
                  {/* Region Collapsible Header */}
                  <button
                    type="button"
                    onClick={() => toggleRegion(reg.regionName)}
                    className="w-full flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
                    aria-expanded={!isCollapsed}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                        {reg.regionName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
                        {regEncCount} {regEncCount === 1 ? 'spot' : 'spots'}
                      </span>
                    </div>
                    {isCollapsed ? (
                      <ChevronRight size={14} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={14} className="text-slate-400" />
                    )}
                  </button>

                  {/* Locations List */}
                  {!isCollapsed && (
                    <div className="p-3 space-y-3">
                      {reg.locations.map(({ location, filteredAreas }) => (
                        <div key={location.id} className="space-y-2">
                          <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            {location.name || location.identifier}
                          </h5>

                          {filteredAreas.map((area, aIdx) => (
                            <div
                              key={aIdx}
                              className="ml-3 pl-3 border-l border-white/10 space-y-2"
                            >
                              <div className="text-[11px] font-medium text-slate-400">
                                {area.areaName}
                              </div>

                              {/* Encounter Rows */}
                              <div className="space-y-1.5">
                                {area.encounters.map((enc, encIdx) => {
                                  const MethodIcon = getMethodIcon(enc.method?.identifier);
                                  const isGiftOrStatic =
                                    enc.chance === null ||
                                    enc.chance === undefined ||
                                    enc.chance === 0 ||
                                    enc.method?.identifier === 'gift' ||
                                    enc.method?.identifier === 'gift-egg' ||
                                    enc.method?.identifier === 'static';
                                  const levelText =
                                    enc.min_level === enc.max_level
                                      ? `Lv. ${enc.min_level}`
                                      : `Lv. ${enc.min_level}–${enc.max_level}`;

                                  return (
                                    <div
                                      key={encIdx}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-white/5"
                                    >
                                      {/* Method Badge & Levels */}
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold">
                                          <MethodIcon size={12} />
                                          <span>{enc.method?.name || enc.method?.identifier || 'Encounter'}</span>
                                        </span>

                                        <span className="text-[11px] font-mono font-bold text-slate-300">
                                          {levelText}
                                        </span>

                                        {/* Version Badge (helpful in All Games view) */}
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                                          {enc.version?.name || enc.version?.identifier}
                                        </span>
                                      </div>

                                      {/* Chance Bar & Conditions */}
                                      <div className="flex items-center gap-3">
                                        {/* Conditions */}
                                        {enc.conditions && enc.conditions.length > 0 && (
                                          <div className="flex gap-1 flex-wrap">
                                            {enc.conditions.map((cond, cIdx) => (
                                              <span
                                                key={cIdx}
                                                className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5"
                                              >
                                                {cond.replace(/-/g, ' ')}
                                              </span>
                                            ))}
                                          </div>
                                        )}

                                        {/* Chance indicator */}
                                        <div className="w-24 text-right">
                                          {isGiftOrStatic ? (
                                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                              Gift / Static
                                            </span>
                                          ) : (
                                            <div className="flex items-center gap-2 justify-end">
                                              <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                <div
                                                  className="h-full bg-emerald-400 rounded-full"
                                                  style={{ width: `${Math.min(enc.chance!, 100)}%` }}
                                                />
                                              </div>
                                              <span className="text-[11px] font-mono font-bold text-emerald-400 w-8 text-right">
                                                {enc.chance}%
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
};

export default EncounterModal;
