import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Medal, Loader2, User, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

interface LeaderboardTeam {
  id: number;
  name: string;
  owner: string;
  pokemon: string[];
  power_score: number;
  created_at: string;
}

const Leaderboard = () => {
  const [teams, setTeams] = useState<LeaderboardTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teams/leaderboard`);
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
        <p className="text-slate-500 font-bold italic">Ranking the masters...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-12">
        <div className="bg-yellow-400 p-4 rounded-3xl text-slate-900 shadow-xl shadow-yellow-100">
          <Trophy size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-800">Elite Architects</h1>
          <p className="text-slate-500 font-medium text-lg">The strongest teams in the PokéArchitect community</p>
        </div>
      </div>

      <div className="grid gap-6">
        {teams.map((team, index) => {
          const isTop3 = index < 3;
          const RankIcon = index === 0 ? Trophy : index === 1 ? Medal : index === 2 ? Medal : null;
          const rankColor = index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-amber-600' : 'text-slate-300';

          return (
            <div 
              key={team.id}
              className={`group relative bg-white rounded-3xl border transition-all duration-300 hover:shadow-2xl hover:border-indigo-100 flex flex-col md:flex-row items-center p-6 gap-8 ${
                isTop3 ? 'border-yellow-100 shadow-xl shadow-yellow-50/50' : 'border-slate-100 shadow-sm'
              }`}
            >
              {/* Rank Badge */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 relative">
                {RankIcon && <RankIcon className={`absolute -top-3 -left-3 ${rankColor} fill-current`} size={24} />}
                <span className={`text-2xl font-black ${isTop3 ? 'text-slate-800' : 'text-slate-400'}`}>
                  #{index + 1}
                </span>
              </div>

              {/* Team Info */}
              <div className="flex-grow text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                  <h3 className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {team.name}
                  </h3>
                  <div className="flex items-center justify-center md:justify-start gap-1.5 text-slate-400 text-sm font-bold bg-slate-50 px-3 py-1 rounded-full w-fit mx-auto md:mx-0">
                    <User size={14} />
                    {team.owner}
                  </div>
                </div>
                <div className="flex justify-center md:justify-start -space-x-3 overflow-hidden">
                  {team.pokemon.map((sprite, idx) => (
                    <div 
                      key={idx}
                      className="w-12 h-12 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center relative z-0 hover:z-10 transition-all hover:scale-125 hover:shadow-lg"
                    >
                      <img src={sprite} alt="pokemon" className="w-10 h-10 object-contain" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Power Score */}
              <div className="flex-shrink-0 text-center bg-indigo-50 px-8 py-4 rounded-2xl border border-indigo-100 min-w-[140px]">
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Power Rating</div>
                <div className="text-3xl font-black text-indigo-600">{team.power_score}</div>
              </div>

              {/* Action */}
              <button 
                onClick={() => navigate('/community')}
                className="flex-shrink-0 p-4 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
