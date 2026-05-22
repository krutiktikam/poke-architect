import React from 'react';
import type { Pokemon } from '../types';
import { X, Trophy, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamDockProps {
  team: Pokemon[];
  onRemove: (id: number) => void;
  onAnalyze?: () => void;
}

const TeamDock: React.FC<TeamDockProps> = ({ team, onRemove }) => {
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl z-40"
    >
      <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] rounded-[32px] p-3 md:p-4 overflow-hidden relative">
        {/* Subtle Inner Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-4 items-center">
          {/* Slots Container */}
          <div className="flex-grow flex justify-between gap-2.5 w-full md:w-auto px-1">
            {Array.from({ length: 6 }).map((_, index) => {
              const member = team[index];
              return (
                <div 
                  key={index} 
                  className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-2xl border transition-all duration-500 relative flex items-center justify-center group ${
                    member 
                      ? 'border-indigo-500/30 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                      : 'border-white/5 bg-white/5 border-dashed'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {member ? (
                      <motion.div
                        key={member.id}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="relative w-full h-full flex items-center justify-center"
                      >
                        <img 
                          src={member.sprite_url} 
                          alt={member.name} 
                          className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.4)] group-hover:scale-110 transition-transform"
                        />
                        <button 
                          onClick={() => onRemove(member.id)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500/20 hover:bg-red-500 backdrop-blur-md text-white rounded-lg p-1 border border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={10} />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.span 
                        initial={{ opacity: 0.1 }}
                        animate={{ opacity: 0.05 }}
                        className="text-white font-black text-xl select-none"
                      >
                        {index + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          
          {/* Action Area */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link 
              to={team.length > 0 ? "/analysis" : "#"}
              className={`group flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all shadow-xl overflow-hidden relative ${
                team.length > 0 
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95' 
                : 'bg-white/5 text-white/20 cursor-not-allowed pointer-events-none border border-white/5'
              }`}
            >
              {team.length > 0 && (
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2 -skew-x-12"
                />
              )}
              ANALYZE
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TeamDock;
