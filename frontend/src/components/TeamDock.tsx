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
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-40"
    >
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-4 md:p-6 overflow-hidden relative">
        {/* Background Grid Accent */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
          {/* Slots Container */}
          <div className="flex-grow flex justify-between gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 px-1">
            {Array.from({ length: 6 }).map((_, index) => {
              const member = team[index];
              return (
                <div 
                  key={index} 
                  className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 transition-all duration-500 relative flex items-center justify-center ${
                    member 
                      ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]' 
                      : 'border-white/5 bg-white/5 border-dashed'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {member ? (
                      <motion.div
                        key={member.id}
                        initial={{ scale: 0, rotate: -20, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="relative w-full h-full flex items-center justify-center"
                      >
                        <img 
                          src={member.sprite_url} 
                          alt={member.name} 
                          className="w-14 h-14 md:w-16 md:h-16 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                        />
                        <button 
                          onClick={() => onRemove(member.id)}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-colors group"
                        >
                          <X size={10} className="group-hover:rotate-90 transition-transform" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.span 
                        initial={{ opacity: 0.2 }}
                        animate={{ opacity: 0.1 }}
                        className="text-white font-black text-2xl select-none"
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
          <div className="flex flex-col w-full md:w-72 gap-3">
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Architect Roster</span>
                <span className="text-white/60 text-xs font-medium">Optimization in progress...</span>
              </div>
              <div className="text-right">
                <span className="text-white font-black text-lg">{team.length}</span>
                <span className="text-white/30 font-bold text-sm">/6</span>
              </div>
            </div>
            
            <Link 
              to={team.length > 0 ? "/analysis" : "#"}
              className={`group flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl font-black text-sm tracking-widest transition-all shadow-xl overflow-hidden relative ${
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
              <Trophy size={18} className="group-hover:scale-110 transition-transform" />
              ANALYZE SYNERGY
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TeamDock;
