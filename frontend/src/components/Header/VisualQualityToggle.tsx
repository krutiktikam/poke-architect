import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisualQuality } from '../../context/useVisualQuality';
import type { QualityMode } from '../../context/VisualQuality.utils';

export const VisualQualityToggle: React.FC = () => {
  const { qualityMode, resolvedQuality, setQualityMode } = useVisualQuality();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const options: Array<{ mode: QualityMode; label: string; desc: string }> = [
    { mode: 'auto', label: 'Auto', desc: `Detects system (${resolvedQuality})` },
    { mode: 'high', label: 'High Quality', desc: 'Full blurs and 60fps animations' },
    { mode: 'low', label: 'Low Quality', desc: 'No blurs, battery & performance saver' },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={`Visual quality mode: ${qualityMode}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 md:px-3 md:py-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white transition-all text-xs font-bold flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <Sparkles size={16} className={resolvedQuality === 'high' ? 'text-amber-400' : 'text-slate-400'} />
        <span className="hidden md:inline font-mono text-[10px] uppercase text-slate-300">
          {qualityMode === 'auto' ? `Auto (${resolvedQuality})` : qualityMode}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-56 z-50 rounded-2xl bg-[#161927] border border-white/10 shadow-2xl p-2"
          >
            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-white/5 mb-1">
              Visual Quality
            </div>
            <div className="space-y-1">
              {options.map((opt) => {
                const isSelected = qualityMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => {
                      setQualityMode(opt.mode);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{opt.desc}</div>
                    </div>
                    {isSelected && <Check size={14} className="text-indigo-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VisualQualityToggle;
