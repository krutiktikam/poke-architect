import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Loader2, Save, Globe, Lock } from 'lucide-react';
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
    fetchPokemon();
  }, [selectedType, selectedGen]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPokemon();
  };

  const handleSaveTeam = async () => {
    if (!teamName) {
      alert('Please enter a team name');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/teams`, {
        name: teamName,
        pokemon_ids: team.map(p => p.id),
        is_public: isPublic
      });
      alert('Team saved successfully!');
      setTeamName('');
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Failed to save team.');
    } finally {
      setSaving(false);
    }
  };

  const types = [
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", 
    "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
  ];

  const generations = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const hasLegendary = team.some(p => p.is_legendary || p.is_mythical);

  return (
    <div className="flex h-[calc(100vh-64px-112px)] overflow-hidden">
      {/* Main Content: Builder */}
      <div className="flex-grow overflow-y-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <form onSubmit={handleSearch} className="flex-grow relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search Pokémon name..." 
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all bg-white text-slate-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative min-w-[160px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <select 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all bg-white appearance-none capitalize text-slate-900"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="">All Types</option>
                  {types.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[160px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <select 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all bg-white appearance-none text-slate-900"
                  value={selectedGen}
                  onChange={(e) => setSelectedGen(e.target.value)}
                >
                  <option value="">All Gens</option>
                  {generations.map(g => (
                    <option key={g} value={g}>Gen {g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Save Team Bar (Visible when team has members) */}
          {team.length > 0 && isAuthenticated && (
            <div className="mb-8 bg-indigo-600 rounded-2xl p-4 shadow-lg shadow-indigo-100 flex flex-col sm:flex-row items-center gap-4 text-white">
              <div className="flex-grow w-full">
                <input 
                  type="text" 
                  placeholder="Give your team a name..." 
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 transition-all"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button 
                  onClick={() => setIsPublic(!isPublic)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-bold"
                >
                  {isPublic ? <Globe size={16} /> : <Lock size={16} />}
                  {isPublic ? 'Public' : 'Private'}
                </button>
                <button 
                  onClick={handleSaveTeam}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-white text-indigo-600 hover:bg-indigo-50 transition-all font-black text-sm disabled:opacity-50 flex-grow sm:flex-grow-0"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  SAVE TEAM
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
              <p className="text-slate-500 font-medium italic">Summoning Pokémon...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {pokemonList.map(pokemon => (
                <PokemonCard 
                  key={pokemon.id} 
                  pokemon={pokemon} 
                  onAdd={() => addToTeam(pokemon)}
                  isAdded={team.some(p => p.id === pokemon.id)}
                  disabled={hasLegendary}
                />
              ))}
            </div>
          )}

          {!loading && pokemonList.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-slate-400 text-lg">No Pokémon found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel: Analysis */}
      <div className="hidden lg:block w-96 flex-shrink-0">
        <LiveAnalysisSidebar />
      </div>
    </div>
  );
};

export default Builder;
