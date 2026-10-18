import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVersion } from '../../context/useVersion';
import { encountersQueryOptions } from '../../api/queries';

import { computeObtainabilityStatus } from './ObtainabilityBadge.utils';
export type { ObtainabilityStatus } from './ObtainabilityBadge.utils';



export interface ObtainabilityBadgeProps {
  pokemonId: number;
  className?: string;
  onClick?: () => void;
}

/**
 * ObtainabilityBadge for Team Builder slots
 * Hidden when selectedVersionId is null
 */
export const ObtainabilityBadge: React.FC<ObtainabilityBadgeProps> = ({
  pokemonId,
  className = '',
  onClick,
}) => {
  const { selectedVersionId, selectedVersion } = useVersion();

  // Hidden when version is null
  if (selectedVersionId === null) {
    return null;
  }

  return (
    <ObtainabilityBadgeContent
      pokemonId={pokemonId}
      versionId={selectedVersionId}
      versionName={selectedVersion?.name || 'Selected Game'}
      className={className}
      onClick={onClick}
    />
  );
};

const ObtainabilityBadgeContent: React.FC<{
  pokemonId: number;
  versionId: number;
  versionName: string;
  className?: string;
  onClick?: () => void;
}> = ({ pokemonId, versionId, versionName, className = '', onClick }) => {
  const { data, isPending } = useQuery(encountersQueryOptions(pokemonId, versionId));

  const status = useMemo(() => computeObtainabilityStatus(data), [data]);

  if (isPending) {
    return (
      <span
        aria-label="Checking catchability..."
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 text-slate-400 border border-white/10 animate-pulse ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Checking...
      </span>
    );
  }

  const badgeConfig = {
    catchable: {
      label: 'Catchable',
      bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400',
      title: `Wild encounters available in ${versionName}`,
    },
    gift_static_only: {
      label: 'Gift or static only',
      bg: 'bg-amber-500/10 hover:bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-400',
      title: `Only obtainable via gift or static encounter in ${versionName}`,
    },
    not_in_wild: {
      label: 'Not in the wild',
      bg: 'bg-rose-500/10 hover:bg-rose-500/20',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-400',
      title: `Not found in the wild in ${versionName}`,
    },
  }[status];

  return (
    <button
      type="button"
      onClick={onClick}
      title={badgeConfig.title}
      aria-label={`Obtainability: ${badgeConfig.label} in ${versionName}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors ${badgeConfig.bg} ${badgeConfig.text} ${badgeConfig.border} ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${badgeConfig.dot}`} />
      <span>{badgeConfig.label}</span>
    </button>
  );
};

export default ObtainabilityBadge;
