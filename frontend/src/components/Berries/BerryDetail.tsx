import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Droplets,
  Sparkles,
  Swords,
  Search,
  RotateCcw,
  Wheat,
} from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { berriesQueryOptions } from '../../api/queries';
import {
  calculateGrowthTimeline,
  calculateNaturalGift,
  normalizeBerryFlavors,
  getBerrySpriteUrl,
  type NormalizedFlavor,
} from './BerryDetail.utils';
export type { GrowthStage, GrowthTimelineResult, NaturalGiftResult, NormalizedFlavor } from './BerryDetail.utils';


const typeColorMap: Record<string, string> = {
  normal: 'bg-stone-500 text-stone-50',
  fire: 'bg-orange-600 text-orange-50',
  water: 'bg-blue-600 text-blue-50',
  electric: 'bg-yellow-500 text-yellow-950',
  grass: 'bg-emerald-600 text-emerald-50',
  ice: 'bg-cyan-500 text-cyan-950',
  fighting: 'bg-red-700 text-red-50',
  poison: 'bg-purple-600 text-purple-50',
  ground: 'bg-amber-600 text-amber-50',
  flying: 'bg-indigo-400 text-indigo-950',
  psychic: 'bg-pink-600 text-pink-50',
  bug: 'bg-lime-600 text-lime-950',
  rock: 'bg-yellow-700 text-yellow-50',
  ghost: 'bg-violet-700 text-violet-50',
  dragon: 'bg-indigo-700 text-indigo-50',
  dark: 'bg-stone-800 text-stone-100',
  steel: 'bg-slate-500 text-slate-50',
  fairy: 'bg-pink-400 text-pink-950',
};

const FlavorRadarChart: React.FC<{ flavors: NormalizedFlavor[]; maxPotency?: number }> = ({
  flavors,
  maxPotency = 40,
}) => {
  const size = 180;
  const center = size / 2;
  const radius = 60;

  // 5 vertices at 72 degree intervals starting at top (-90 deg)
  const angleStep = (Math.PI * 2) / 5;
  const startAngle = -Math.PI / 2;

  const points = flavors.map((f, i) => {
    const angle = startAngle + i * angleStep;
    const factor = Math.min(1, Math.max(0.08, f.potency / maxPotency));
    const r = radius * factor;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle, ...f };
  });

  const polygonPath = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Grid rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        aria-label="Flavor Radar Chart"
      >
        {/* Background Grid Rings */}
        {rings.map((ringFactor, idx) => {
          const ringPoints = Array.from({ length: 5 }).map((_, i) => {
            const angle = startAngle + i * angleStep;
            const r = radius * ringFactor;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          });
          return (
            <polygon
              key={idx}
              points={ringPoints.join(' ')}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis Spokes */}
        {Array.from({ length: 5 }).map((_, i) => {
          const angle = startAngle + i * angleStep;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data Radar Polygon */}
        <polygon
          points={polygonPath}
          fill="rgba(99, 102, 241, 0.35)"
          stroke="#818cf8"
          strokeWidth="2"
          className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-300"
        />

        {/* Vertices */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.potency > 0 ? 3.5 : 2}
            fill={p.potency > 0 ? p.color : '#64748b'}
            stroke="#ffffff"
            strokeWidth="1"
          />
        ))}

        {/* Labels */}
        {flavors.map((f, i) => {
          const angle = startAngle + i * angleStep;
          const labelDist = radius + 18;
          const lx = center + labelDist * Math.cos(angle);
          const ly = center + labelDist * Math.sin(angle);
          return (
            <text
              key={f.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9"
              fontWeight="bold"
              fill={f.potency > 0 ? f.color : '#94a3b8'}
              className="select-none tracking-tight"
            >
              {f.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export interface BerryDetailProps {
  berryId?: number | null;
  berryName?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export const BerryDetail: React.FC<BerryDetailProps> = ({
  berryId,
  berryName,
  isOpen,
  onClose,
  className = '',
}) => {
  const [selectedBerryId, setSelectedBerryId] = useState<number | null>(berryId ?? null);
  const [searchFilter, setSearchFilter] = useState('');

  const {
    data: berries,
    isPending,
    isError,
    refetch,
  } = useQuery(berriesQueryOptions());

  // Determine active berry
  const activeBerry = useMemo(() => {
    if (!berries || berries.length === 0) return null;
    if (selectedBerryId) {
      const found = berries.find((b) => b.id === selectedBerryId);
      if (found) return found;
    }
    if (berryName) {
      const cleanName = berryName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const found = berries.find(
        (b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName
      );
      if (found) return found;
    }
    return berries[0];
  }, [berries, selectedBerryId, berryName]);

  const growth = useMemo(() => {
    return calculateGrowthTimeline(activeBerry?.growth_time, activeBerry?.soil_dryness);
  }, [activeBerry]);

  const naturalGift = useMemo(() => {
    if (!activeBerry) return null;
    return calculateNaturalGift(activeBerry);
  }, [activeBerry]);

  const flavors = useMemo(() => {
    return normalizeBerryFlavors(activeBerry?.flavors);
  }, [activeBerry]);

  const filteredBerries = useMemo(() => {
    if (!berries) return [];
    if (!searchFilter.trim()) return berries;
    const q = searchFilter.toLowerCase();
    return berries.filter(
      (b) => b.name.toLowerCase().includes(q) || (b.item_name && b.item_name.toLowerCase().includes(q))
    );
  }, [berries, searchFilter]);

  const content = (
    <div className={`space-y-6 ${className}`}>
      {/* Loading state */}
      {isPending && (
        <div data-testid="berry-detail-loading" className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading berry database...</p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-rose-400">Failed to load berry data.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all border border-white/10"
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {!isPending && !isError && activeBerry && (
        <div className="space-y-6">
          {/* Quick Berry Selector / Search */}
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Find berry..."
                aria-label="Find berry"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={activeBerry.id}
              onChange={(e) => setSelectedBerryId(Number(e.target.value))}
              aria-label="Select Berry"
              className="w-full sm:w-48 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs capitalize focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {filteredBerries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name.replace(/-/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Berry Hero Banner */}
          <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
              <img
                src={getBerrySpriteUrl(activeBerry.item_name, activeBerry.name)}
                alt={activeBerry.name}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-10 h-10 object-contain drop-shadow"
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-black text-white capitalize">
                  {activeBerry.name.replace(/-/g, ' ')}
                </h2>
                {activeBerry.firmness && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-bold uppercase tracking-wider">
                    {activeBerry.firmness}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Size: <strong className="text-white">{activeBerry.size ? `${activeBerry.size / 10} cm` : 'N/A'}</strong> •
                Smoothness: <strong className="text-white">{activeBerry.smoothness ?? 'N/A'}</strong> •
                Max Yield: <strong className="text-indigo-400">{activeBerry.max_harvest ?? 'N/A'} berries</strong>
              </p>
            </div>
          </div>

          {/* Farm Planner & Growth Timeline */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wheat size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Farm Planner & Growth Timeline
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                {growth.formattedHarvestTime}
              </span>
            </div>

            {/* Stages Step Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {growth.stages.map((stg) => (
                <div
                  key={stg.stage}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-slate-400">
                      Stage {stg.stage}
                    </span>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">
                      {stg.cumulativeHours}h
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white">{stg.name}</p>
                  <p className="text-[10px] text-slate-400">+{stg.durationHours}h</p>
                </div>
              ))}
            </div>

            {/* Watering & Soil Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Droplets size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Watering Schedule
                  </span>
                  <span className="text-xs font-bold text-white">
                    Every {growth.recommendedWateringIntervalHours} hours
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Clock size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Soil Drying Rate
                  </span>
                  <span className="text-xs font-bold text-white">
                    {growth.soilDryness}% moisture / hour
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Flavor Profile & Radar Chart */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-pink-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Flavor Potency Profile
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Radar Chart */}
              <div className="flex justify-center p-2">
                <FlavorRadarChart flavors={flavors} />
              </div>

              {/* Potency Bars */}
              <div className="space-y-2.5">
                {flavors.map((fl) => {
                  const pct = Math.min(100, Math.round((fl.potency / 40) * 100));
                  return (
                    <div key={fl.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold capitalize flex items-center gap-1.5" style={{ color: fl.color }}>
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: fl.color }}
                          />
                          {fl.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {fl.contest}
                          </span>
                          <span className="font-mono font-bold text-white text-[11px]">
                            {fl.potency}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: fl.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Battle Planner: Natural Gift */}
          {naturalGift && (
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-center gap-2">
                <Swords size={16} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Battle Planner: Natural Gift
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                    typeColorMap[naturalGift.type] || 'bg-slate-700 text-white'
                  }`}
                >
                  {naturalGift.type}
                </span>

                <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-mono text-xs font-black border border-indigo-500/30">
                  {naturalGift.power} BP
                </span>

                <p className="text-xs text-slate-300 flex-1">
                  {naturalGift.description}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isOpen !== undefined && onClose) {
    return (
      <Sheet
        isOpen={isOpen}
        onClose={onClose}
        title={activeBerry ? `${activeBerry.name.replace(/-/g, ' ')} Details` : 'Berry Planner'}
        description="Growth schedule, flavor potencies, and Natural Gift mechanics."
        maxWidth="max-w-2xl"
      >
        <div className="p-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
          {content}
        </div>
      </Sheet>
    );
  }

  return content;
};

export default BerryDetail;
