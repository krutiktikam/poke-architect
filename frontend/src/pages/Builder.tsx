import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Loader2, Save, Globe, Lock, Cpu, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PokemonCard from '../components/PokemonCard';
import LiveAnalysisSidebar from '../components/LiveAnalysisSidebar';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import type { Pokemon } from '../types';

import { API_BASE_URL } from '../config';

const Builder = () => {
  const { team, addToTeam } = useTeam();
  const { isAuthenticated } = useAuth();
  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedGen, setSelectedGen] = useState<string>('');
  
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

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
    <div className="flex h-[calc(100vh-80px-112px)] overflow-hidden bg-slate-50 relative">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #4f46e5 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Main Content: Builder */}
      <div className="flex-grow overflow-y-auto px-6 py-10 relative z-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          
          {/* Search & Filter Matrix */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row gap-4 mb-12 glass-panel p-6 rounded-[32px]"
          >
            <div className="flex-grow relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Initialize search sequence..." 
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-50 focus:border-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all bg-slate-50/50 text-slate-900 font-bold placeholder:text-slate-300 placeholder:font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative min-w-[180px]">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                <select 
                  className="w-full pl-12 pr-10 py-4 rounded-2xl border-2 border-slate-50 focus:border-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all bg-slate-50/50 appearance-none capitalize text-slate-900 font-bold cursor-pointer"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="">ALL TYPES</option>
                  {types.map(t => (
                    <option key={t} value={t}>{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[180px]">
                <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                <select 
                  className="w-full pl-12 pr-10 py-4 rounded-2xl border-2 border-slate-50 focus:border-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all bg-slate-50/50 appearance-none text-slate-900 font-bold cursor-pointer"
                  value={selectedGen}
                  onChange={(e) => setSelectedGen(e.target.value)}
                >
                  <option value="">ALL GENS</option>
                  {generations.map(g => (
                    <option key={g} value={g}>GENERATION {g}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Save Team Bar */}
          <AnimatePresence>
            {team.length > 0 && isAuthenticated && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-12 glass-panel-dark rounded-[32px] p-6 flex flex-col lg:flex-row items-center gap-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-50" />
                <div className="flex-grow w-full">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 block px-1">Designation Label</label>
                  <input 
                    type="text" 
                    placeholder="Enter project codename..." 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-indigo-500/50 transition-all font-bold"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4 w-full lg:w-auto self-end lg:self-center">
                  <button 
                    onClick={() => setIsPublic(!isPublic)}
                    className={`flex items-center gap-3 px-5 py-3 rounded-2xl transition-all text-xs font-black uppercase tracking-widest border ${
                      isPublic ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-slate-800 border-white/5 text-slate-400'
                    }`}
                  >
                    {isPublic ? <Globe size={16} /> : <Lock size={16} />}
                    {isPublic ? 'Public Access' : 'Private Encryption'}
                  </button>
                  <button 
                    onClick={handleSaveTeam}
                    disabled={saving}
                    className="flex items-center justify-center gap-3 px-8 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50 flex-grow lg:flex-grow-0 shadow-lg shadow-indigo-600/30"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    COMMIT ROSTER
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
              </div>
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Syncing Database...</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-8"
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
              className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-slate-100"
            >
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="text-slate-300 w-8 h-8" />
              </div>
              <p className="text-slate-400 text-lg font-bold">Zero matches found in current sector.</p>
              <button 
                onClick={() => { setSearchTerm(''); setSelectedType(''); setSelectedGen(''); }}
                className="mt-4 text-indigo-500 font-black uppercase tracking-widest text-xs hover:underline"
              >
                Reset Search Filters
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Side Panel: Analysis */}
      <div className="hidden 2xl:block w-[400px] flex-shrink-0 relative z-20">
        <LiveAnalysisSidebar />
      </div>
    </div>
  );
};

export default Builder;
