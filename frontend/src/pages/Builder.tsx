import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Loader2 } from 'lucide-react';
import PokemonCard from '../components/PokemonCard';
import { useTeam } from '../context/TeamContext';
import type { Pokemon } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

const Builder = () => {
  const { team, addToTeam } = useTeam();
  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedGen, setSelectedGen] = useState<string>('');

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

  const types = [
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", 
    "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
  ];

  const generations = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="container mx-auto px-4 py-8">
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
          <p className="text-slate-500 font-medium italic">Summoning Pokémon...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {pokemonList.map(pokemon => (
            <PokemonCard 
              key={pokemon.id} 
              pokemon={pokemon} 
              onAdd={() => addToTeam(pokemon)}
              isAdded={team.some(p => p.id === pokemon.id)}
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
  );
};

export default Builder;
