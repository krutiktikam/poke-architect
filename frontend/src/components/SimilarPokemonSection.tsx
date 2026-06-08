import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, ArrowLeftRight, Loader2, Info, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

interface SimilarPokemonSectionProps {
  currentTeam: any[];
  onAdd: (p: any) => void;
  onSwap: (p: any) => void;
  isFull: boolean;
}

const SimilarPokemonSection: React.FC<SimilarPokemonSectionProps> = ({ currentTeam, onAdd, onSwap, isFull }) => {
  const [similarPokemon, setSimilarPokemon] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (currentTeam.length > 0 && currentTeam[activeTab]) {
      fetchSimilar(currentTeam[activeTab]?.id);
    }
  }, [currentTeam, activeTab]);

  const fetchSimilar = async (pokemonId: number) => {
    if (!pokemonId) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/pokemon/${pokemonId}/similar`);
      setSimilarPokemon(response.data);
    } catch (err) {
      console.error('Error fetching similar pokemon:', err);
    } finally {
      setLoading(false);
    }
  };

  if (currentTeam.length === 0) return null;

  return (
    <div className="bg-slate-900/40 backdrop-blur-2xl rounded-[3rem] p-8 md:p-12 border border-white/5 shadow-2xl mb-12 relative overflow-hidden">
      {/* Decorative background accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] -mr-48 -mt-48" />
      
      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
        <div className="flex items-center gap-5">
          <div className="bg-indigo-600 p-5 rounded-[2rem] text-white shadow-xl shadow-indigo-600/20 relative">
            <Sparkles size={32} className="relative z-10" />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute inset-0 bg-white/20 blur-xl rounded-full"
            />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">AI Similarity Engine</h3>
            <p className="text-slate-400 font-bold text-sm tracking-wide uppercase opacity-60">Architect Discovery Vector</p>
          </div>
        </div>

        <div className="flex bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-xl overflow-x-auto max-w-full no-scrollbar shadow-inner">
          {currentTeam.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setActiveTab(idx)}
              className={`flex-shrink-0 px-6 py-3 rounded-2xl transition-all flex items-center gap-3 group ${
                activeTab === idx 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <img src={p.sprite_url} alt={p.name} className={`w-8 h-8 object-contain transition-transform ${activeTab === idx ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="text-xs font-black uppercase tracking-[0.2em] hidden sm:inline">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-6"
          >
            <div className="relative">
              <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
            </div>
            <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Running Neural Mapping...</p>
          </motion.div>
        ) : (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6"
          >
            {similarPokemon.map((p, idx) => (
              <motion.div 
                key={p.id} 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
                className="group bg-white/5 rounded-[2.5rem] p-8 border border-white/5 hover:border-indigo-500/50 hover:bg-white/10 hover:shadow-2xl hover:shadow-indigo-900/20 transition-all relative overflow-hidden"
              >
                {/* Type Accent Glow */}
                <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="absolute top-5 right-5 z-20">
                  <button 
                    onClick={() => isFull ? onSwap(p) : onAdd(p)}
                    className={`w-12 h-12 rounded-2xl text-white shadow-xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${
                      isFull ? 'bg-amber-500 shadow-amber-900/20' : 'bg-indigo-600 shadow-indigo-900/20'
                    }`}
                  >
                    {isFull ? <ArrowLeftRight size={20} /> : <Zap size={20} />}
                  </button>
                </div>

                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl scale-150" />
                    <img 
                      src={p.sprite_url} 
                      alt={p.name} 
                      className="w-24 h-24 object-contain relative z-10 drop-shadow-[0_20px_30px_rgba(0,0,0,0.3)] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500" 
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1 mb-4">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-[9px] font-black px-2.5 py-1 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/20 uppercase tracking-widest inline-block">
                        {p.role || 'Balanced'}
                      </span>
                      {p.tier && p.tier !== 'N/A' && (
                        <span className="text-[9px] font-black px-2.5 py-1 bg-white/5 text-white/60 rounded-lg border border-white/10 uppercase tracking-widest inline-block">
                          {p.tier}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-black text-white capitalize tracking-tight truncate w-full">{p.name}</h4>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
                    <Target size={12} className="text-indigo-400" />
                    <span>Stat Match</span>
                  </div>
                </div>
              </motion.div>
            ))}
            {similarPokemon.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                  <Info className="text-slate-600" />
                </div>
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No similar signatures detected in sector.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SimilarPokemonSection;
