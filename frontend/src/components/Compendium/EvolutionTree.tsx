import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowDown, Sparkles, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';
import { evolutionQueryOptions, type EvolutionEdge, type EvolutionNode } from '../../api/queries';

export interface EvolutionTreeProps {
  pokemonId: number;
  currentSpeciesId?: number;
  onSelectSpecies?: (speciesId: number, pokemonId?: number | null) => void;
  className?: string;
}

import { formatEvolutionRequirement } from './EvolutionTree.utils';


/**
 * EvolutionTree Component
 */
export const EvolutionTree: React.FC<EvolutionTreeProps> = ({
  pokemonId,
  currentSpeciesId,
  onSelectSpecies,
  className = '',
}) => {
  const { data, isPending, isError, error, refetch } = useQuery(evolutionQueryOptions(pokemonId));

  // Compute layered graph layout using BFS from root
  const { layers, edgesByTarget } = useMemo(() => {
    if (!data || !data.nodes || data.nodes.length === 0) {
      return { layers: [] as EvolutionNode[][], edgesByTarget: new Map<number, EvolutionEdge[]>() };
    }

    const nodes = data.nodes;
    const edges = data.edges || [];

    const eTargetMap = new Map<number, EvolutionEdge[]>();
    edges.forEach((e) => {
      const list = eTargetMap.get(e.to_species_id) || [];
      list.push(e);
      eTargetMap.set(e.to_species_id, list);
    });

    const childSpeciesIds = new Set(edges.map((e) => e.to_species_id));
    // Root species are those never appearing as to_species_id
    const roots = nodes.filter((n) => !childSpeciesIds.has(n.species_id));
    if (roots.length === 0 && nodes.length > 0) {
      roots.push(nodes[0]);
    }

    // BFS depth assignment
    const depthMap = new Map<number, number>();
    const queue: { speciesId: number; depth: number }[] = roots.map((r) => ({ speciesId: r.species_id, depth: 0 }));
    roots.forEach((r) => depthMap.set(r.species_id, 0));

    while (queue.length > 0) {
      const { speciesId, depth } = queue.shift()!;
      const outgoing = edges.filter((e) => e.from_species_id === speciesId);
      for (const edge of outgoing) {
        const nextDepth = depth + 1;
        const currentAssigned = depthMap.get(edge.to_species_id);
        if (currentAssigned === undefined || nextDepth > currentAssigned) {
          depthMap.set(edge.to_species_id, nextDepth);
          queue.push({ speciesId: edge.to_species_id, depth: nextDepth });
        }
      }
    }

    // Group nodes by layer
    const maxDepth = Math.max(0, ...Array.from(depthMap.values()));
    const computedLayers: EvolutionNode[][] = Array.from({ length: maxDepth + 1 }, () => []);

    nodes.forEach((n) => {
      const d = depthMap.get(n.species_id) ?? 0;
      computedLayers[d].push(n);
    });

    return { layers: computedLayers, edgesByTarget: eTargetMap };
  }, [data]);

  // Loading skeleton state
  if (isPending) {
    return (
      <div className={`p-6 rounded-3xl bg-[#121524]/60 border border-white/5 ${className}`} aria-busy="true" aria-label="Loading evolution tree">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles size={16} className="text-indigo-400 animate-pulse" />
          <span className="text-xs font-black tracking-widest text-slate-400 uppercase">Evolution Lineage</span>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-8">
          <div className="w-28 h-32 rounded-2xl bg-white/5 animate-pulse" />
          <div className="w-12 h-6 rounded-full bg-white/5 animate-pulse" />
          <div className="w-28 h-32 rounded-2xl bg-white/5 animate-pulse" />
          <div className="w-12 h-6 rounded-full bg-white/5 animate-pulse" />
          <div className="w-28 h-32 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state with retry button
  if (isError) {
    return (
      <div className={`p-6 rounded-3xl bg-rose-950/20 border border-rose-500/20 text-center ${className}`}>
        <AlertCircle size={32} className="mx-auto text-rose-400 mb-2" />
        <h3 className="text-sm font-bold text-white mb-1">Failed to load evolution tree</h3>
        <p className="text-xs text-rose-300/80 mb-4">{error?.message || 'An unexpected network error occurred.'}</p>
        <button
          onClick={() => refetch()}
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className={`p-8 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 text-center ${className}`}>
        <HelpCircle size={32} className="mx-auto text-slate-500 mb-2" />
        <p className="text-xs font-bold text-slate-400">No evolution data available for this species.</p>
      </div>
    );
  }

  const isSingleStage = data.nodes.length === 1 && (!data.edges || data.edges.length === 0);

  return (
    <div
      className={`p-5 md:p-8 rounded-3xl bg-[#121524]/70 border border-white/10 shadow-2xl relative overflow-hidden ${className}`}
      aria-label="Pokémon Evolution Chain"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-400" />
          <h3 className="text-xs md:text-sm font-black tracking-widest text-slate-300 uppercase">
            Evolution Lineage
          </h3>
        </div>
        {isSingleStage && (
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold border border-white/5">
            Single Stage (Does not evolve)
          </span>
        )}
      </div>

      {/* Main Flow Diagram */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 overflow-x-auto py-2 custom-scrollbar">
        {layers.map((layerNodes, layerIndex) => {
          return (
            <React.Fragment key={layerIndex}>
              {/* Connector between layers for mobile (down) or desktop (right) */}
              {layerIndex > 0 && (
                <div
                  className="flex flex-col items-center justify-center text-slate-500 select-none py-1 md:py-0"
                  aria-hidden="true"
                >
                  <ArrowDown size={18} className="md:hidden text-indigo-400/60 animate-bounce" />
                  <ArrowRight size={20} className="hidden md:block text-indigo-400/60" />
                </div>
              )}

              {/* Layer Column (Desktop) / Row (Mobile) */}
              <div
                className={`flex ${
                  layerNodes.length > 2
                    ? 'flex-wrap justify-center max-w-sm md:max-w-md gap-3'
                    : 'flex-col sm:flex-row md:flex-col gap-3'
                } items-center`}
              >
                {layerNodes.map((node) => {
                  const isCurrent =
                    (currentSpeciesId && node.species_id === currentSpeciesId) ||
                    (node.pokemon_id && node.pokemon_id === pokemonId);

                  // Incoming edges to this node to display requirement labels
                  const incomingEdges = edgesByTarget.get(node.species_id) || [];
                  const reqLabels = incomingEdges.map((e) => formatEvolutionRequirement(e));

                  return (
                    <div key={node.species_id} className="flex flex-col items-center">
                      {/* Requirements Badge Above Node if incoming edge exists */}
                      {reqLabels.length > 0 && (
                        <div
                          className="mb-2 max-w-[180px] text-center"
                          aria-label={`Requirement to evolve into ${node.name}: ${reqLabels.join(' or ')}`}
                        >
                          <span
                            title={reqLabels.join(' | ')}
                            className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 truncate max-w-full shadow-sm"
                          >
                            {reqLabels[0]}
                            {reqLabels.length > 1 && (
                              <span className="ml-1 text-[9px] text-indigo-400/70 font-mono">
                                +{reqLabels.length - 1}
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Node Card */}
                      <button
                        type="button"
                        onClick={() => onSelectSpecies?.(node.species_id, node.pokemon_id)}
                        disabled={!onSelectSpecies}
                        aria-label={`${node.name}${isCurrent ? ' (Current)' : ''}`}
                        className={`group relative flex flex-col items-center p-3.5 rounded-2xl transition-all duration-300 ${
                          isCurrent
                            ? 'bg-indigo-600/20 border-2 border-indigo-500 ring-4 ring-indigo-500/20 shadow-[0_0_25px_rgba(99,102,241,0.3)] scale-105'
                            : 'bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20'
                        } ${onSelectSpecies ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default'}`}
                      >
                        {/* Current Indicator Ribbon */}
                        {isCurrent && (
                          <div className="absolute -top-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[8px] font-black uppercase tracking-wider shadow">
                            Current
                          </div>
                        )}

                        {/* Sprite */}
                        <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center relative mb-1">
                          {node.sprite_url ? (
                            <img
                              src={node.sprite_url}
                              alt={node.name}
                              loading="lazy"
                              className="max-w-full max-h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 text-xs font-bold">
                              ?
                            </div>
                          )}
                        </div>

                        {/* Name and Species ID */}
                        <span className="text-xs font-black text-white capitalize group-hover:text-indigo-300 transition-colors">
                          {node.name}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-slate-500 mt-0.5">
                          #{String(node.species_id).padStart(3, '0')}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default EvolutionTree;
