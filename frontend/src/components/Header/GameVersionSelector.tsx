import React, { useState, useRef, useEffect, useId } from 'react';
import { Gamepad2, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVersion } from '../../context/useVersion';

export const GameVersionSelector: React.FC = () => {
  const { versions, selectedVersionId, selectedVersion, setSelectedVersionId, versionsByGeneration } = useVersion();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    }
  };

  const genLabels: Record<number, string> = {
    1: 'Gen I (Kanto)',
    2: 'Gen II (Johto)',
    3: 'Gen III (Hoenn)',
    4: 'Gen IV (Sinnoh)',
    5: 'Gen V (Unova)',
    6: 'Gen VI (Kalos)',
    7: 'Gen VII (Alola)',
    8: 'Gen VIII (Galar)',
    9: 'Gen IX (Paldea)',
  };

  const handleSelect = (id: number | null) => {
    setSelectedVersionId(id);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`Select Game Version: ${selectedVersion ? selectedVersion.name : 'All Games'}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white transition-all text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <Gamepad2 size={16} className="text-indigo-400 shrink-0" />
        <span className="hidden sm:inline max-w-[130px] truncate">
          {selectedVersion ? selectedVersion.name : 'All Games'}
        </span>
        <span className="sm:hidden font-mono text-[10px] uppercase">
          {selectedVersion ? selectedVersion.name.slice(0, 7) : 'All'}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={menuId}
            role="listbox"
            tabIndex={-1}
            aria-label="Pokémon Game Versions"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto custom-scrollbar z-50 rounded-2xl bg-[#161927] border border-white/10 shadow-2xl p-2"
          >
            {/* All Games Reset Option */}
            <button
              type="button"
              role="option"
              aria-selected={selectedVersionId === null}
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                selectedVersionId === null
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>All Games (Default)</span>
              {selectedVersionId === null && <Check size={14} />}
            </button>

            <div className="my-1.5 border-t border-white/5" />

            {/* Generation Groups */}
            {Object.keys(versionsByGeneration)
              .map(Number)
              .sort((a, b) => a - b)
              .map((gen) => {
                const groupVersions = versionsByGeneration[gen] || [];
                if (groupVersions.length === 0) return null;

                return (
                  <div key={gen} className="mb-2 last:mb-0">
                    <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {genLabels[gen] || `Generation ${gen}`}
                    </div>
                    <div className="space-y-0.5">
                      {groupVersions.map((v) => {
                        const isSelected = selectedVersionId === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSelect(v.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span>{v.name}</span>
                            {isSelected && <Check size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {versions.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500 italic">
                Loading game versions...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameVersionSelector;
