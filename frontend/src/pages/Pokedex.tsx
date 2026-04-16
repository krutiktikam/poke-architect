import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Loader2, BarChart2 } from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import type { Pokemon } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

const typeColors: Record<string, string> = {
  normal: 'bg-stone-400',
  fire: 'bg-orange-500',
  water: 'bg-blue-500',
  electric: 'bg-yellow-400',
  grass: 'bg-green-500',
  ice: 'bg-cyan-300',
  fighting: 'bg-red-600',
  poison: 'bg-purple-500',
  ground: 'bg-amber-600',
  flying: 'bg-indigo-300',
  psychic: 'bg-pink-500',
  bug: 'bg-lime-500',
  rock: 'bg-yellow-700',
  ghost: 'bg-violet-700',
  dragon: 'bg-indigo-600',
  dark: 'bg-stone-700',
  steel: 'bg-slate-400',
  fairy: 'bg-pink-300',
};

const Pokedex = () => {
  const { addToTeam, team } = useTeam();
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
          limit: 100 // Pokedex shows more at once or uses pagination
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
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">The Grand PokéDex</h1>
        <p className="text-slate-500 italic">Exploring {pokemonList.length}+ species across 9 regions</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-12 bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
        <form onSubmit={handleSearch} className="flex-grow relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search encyclopedia..." 
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all bg-slate-50 text-slate-900 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative min-w-[180px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select 
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all bg-slate-50 appearance-none capitalize text-slate-900 font-bold"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              {types.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[180px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select 
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all bg-slate-50 appearance-none text-slate-900 font-bold"
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
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
          <p className="text-slate-500 font-bold text-xl">Consulting the archives...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pokemonList.map(pokemon => (
            <div key={pokemon.id} className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-slate-100 flex flex-col group">
              <div className="bg-slate-50 p-6 flex justify-center items-center relative h-56 overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                <img 
                  src={pokemon.sprite_url} 
                  alt={pokemon.name} 
                  className="w-44 h-44 object-contain group-hover:scale-110 transition-transform duration-500 relative z-10"
                />
                <span className="absolute top-4 left-6 text-slate-300 text-3xl font-black italic opacity-50">
                  #{String(pokemon.id).padStart(3, '0')}
                </span>
                <div className="absolute bottom-4 right-6 flex gap-2">
                   <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 shadow-sm border border-slate-100 uppercase">
                     {pokemon.region}
                   </div>
                </div>
              </div>
              
              <div className="p-8 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 capitalize leading-none mb-1">{pokemon.name}</h3>
                    <div className="flex gap-2">
                      <span className={`${typeColors[pokemon.type1]} text-white text-[10px] px-2 py-0.5 rounded-md uppercase font-black tracking-tighter`}>
                        {pokemon.type1}
                      </span>
                      {pokemon.type2 && (
                        <span className={`${typeColors[pokemon.type2]} text-white text-[10px] px-2 py-0.5 rounded-md uppercase font-black tracking-tighter`}>
                          {pokemon.type2}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-100 rounded-xl p-2 flex flex-col items-center min-w-[60px]">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Total</span>
                    <span className="text-lg font-black text-slate-700 leading-none">
                      {pokemon.hp + pokemon.attack + pokemon.defense + pokemon.special_attack + pokemon.special_defense + pokemon.speed}
                    </span>
                  </div>
                </div>

                {/* Stat Bars */}
                <div className="space-y-3 mb-8">
                   <StatBar label="HP" value={pokemon.hp} max={255} color="bg-rose-500" />
                   <StatBar label="ATK" value={pokemon.attack} max={190} color="bg-orange-500" />
                   <StatBar label="DEF" value={pokemon.defense} max={230} color="bg-yellow-500" />
                   <StatBar label="SPD" value={pokemon.speed} max={200} color="bg-emerald-500" />
                </div>

                <div className="mt-auto">
                  <button 
                    onClick={() => addToTeam(pokemon)}
                    disabled={team.some(p => p.id === pokemon.id)}
                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                      team.some(p => p.id === pokemon.id)
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 active:scale-95'
                    }`}
                  >
                    <BarChart2 size={18} />
                    {team.some(p => p.id === pokemon.id) ? 'Drafted to Team' : 'Recruit for Team'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatBar = ({ label, value, max, color }: { label: string, value: number, max: number, color: string }) => (
  <div className="flex items-center gap-3">
    <span className="text-[10px] font-black text-slate-400 w-8">{label}</span>
    <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} rounded-full transition-all duration-1000`} 
        style={{ width: `${(value / max) * 100}%` }}
      ></div>
    </div>
    <span className="text-xs font-bold text-slate-600 w-8 text-right">{value}</span>
  </div>
);

export default Pokedex;
