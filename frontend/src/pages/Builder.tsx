import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Loader2, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PokemonCard from '../components/PokemonCard';
import LiveAnalysisSidebar from '../components/LiveAnalysisSidebar';
import { useTeam } from '../context/TeamContext';
import type { Pokemon } from '../types';

import { API_BASE_URL } from '../config';

const Builder = () => {
  const { team, addToTeam } = useTeam();
  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedGen, setSelectedGen] = useState<string>('');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPokemon();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedType, selectedGen]);

  const fetchPokemon = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/pokemon`, {
        params: {
          search: searchTerm || undefined,
          type: selectedType || undefined,
          generation: selectedGen || undefined,
          limit: 250
        }
      });
      setPokemonList(response.data);
    } catch (error) {
      console.error('Error fetching pokemon:', error);
    } finally {
      setLoading(false);
    }
  };

  const types = [
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", 
    "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
  ];

  const generations = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const hasLegendary = team.some(p => p.is_legendary || p.is_mythical);

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden relative">
      {/* Main Content: Builder */}
      <div className="flex-grow overflow-y-auto px-4 sm:px-6 py-8 relative z-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Section */}
          <div className="mb-10">
            <h2 className="text-3xl font-black text-white tracking-tighter mb-2">Explore & create</h2>
            <p className="text-slate-500 text-sm font-medium">Build your mathematically optimized Pokémon roster.</p>
          </div>

          {/* Search & Filter Matrix */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row gap-4 mb-10 glass-panel p-5 rounded-[36px]"
          >
            <div className="flex-grow relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search database..." 
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/5 focus:border-indigo-500/30 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all bg-white/[0.02] text-white font-bold placeholder:text-slate-600 placeholder:font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative min-w-[160px]">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <select 
                  className="w-full pl-10 pr-10 py-3.5 rounded-2xl border border-white/5 focus:border-indigo-500/30 focus:outline-none transition-all bg-white/[0.02] appearance-none capitalize text-white font-bold cursor-pointer text-sm"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="" className="bg-slate-900">ALL TYPES</option>
                  {types.map(t => (
                    <option key={t} value={t} className="bg-slate-900">{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[160px]">
                <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <select 
                  className="w-full pl-10 pr-10 py-3.5 rounded-2xl border border-white/5 focus:border-indigo-500/30 focus:outline-none transition-all bg-white/[0.02] appearance-none text-white font-bold cursor-pointer text-sm"
                  value={selectedGen}
                  onChange={(e) => setSelectedGen(e.target.value)}
                >
                  <option value="" className="bg-slate-900">ALL GENS</option>
                  {generations.map(g => (
                    <option key={g} value={g} className="bg-slate-900">GEN {g}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Results Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
              </div>
              <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Initializing Sync...</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              <AnimatePresence>
                {pokemonList.map(pokemon => (
                  <PokemonCard 
                    key={pokemon.id} 
                    pokemon={pokemon} 
                    onAdd={() => addToTeam(pokemon)}
                    isAdded={team.some(p => p.id === pokemon.id)}
                    disabled={hasLegendary}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {!loading && pokemonList.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-white/[0.02] rounded-[32px] border border-dashed border-white/5"
            >
              <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="text-slate-600 w-6 h-6" />
              </div>
              <p className="text-slate-500 text-lg font-bold">Zero matches found.</p>
              <button 
                onClick={() => { setSearchTerm(''); setSelectedType(''); setSelectedGen(''); }}
                className="mt-4 text-indigo-400 font-black uppercase tracking-widest text-[10px] hover:text-indigo-300 transition-colors"
              >
                Reset Sector Filters
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Side Panel: Analysis */}
      <div className="hidden 2xl:block w-[380px] flex-shrink-0 relative z-20">
        <LiveAnalysisSidebar />
      </div>
    </div>
  );
};

export default Builder;
