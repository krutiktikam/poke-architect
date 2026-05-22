import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Medal, Loader2, User, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <div className="container mx-auto px-4 py-12 max-w-5xl relative z-10">
      <div className="flex items-center gap-6 mb-16">
        <div className="bg-indigo-600 p-5 rounded-[32px] text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] aura-glow">
          <Trophy size={36} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Elite Architects</h1>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.2em] mt-1">Global System Rankings</p>
        </div>
      </div>

      <div className="grid gap-4">
        {teams.map((team, index) => {
          const isTop3 = index < 3;
          const RankIcon = index === 0 ? Trophy : index === 1 ? Medal : index === 2 ? Medal : null;
          const rankColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-orange-400' : 'text-slate-500';

          return (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={team.id}
              className={`group relative glass-card rounded-[40px] flex flex-col md:flex-row items-center p-6 gap-8 ${
                isTop3 ? 'ring-1 ring-white/10 bg-white/[0.04]' : ''
              }`}
            >
              {/* Rank Badge */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 relative">
                {RankIcon && <RankIcon className={`absolute -top-4 -left-4 ${rankColor} drop-shadow-[0_0_10px_currentColor]`} size={28} />}
                <span className={`text-3xl font-black ${isTop3 ? 'text-white' : 'text-slate-600'}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              {/* Team Info */}
              <div className="flex-grow text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                  <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                    {team.name}
                  </h3>
                  <div className="flex items-center justify-center md:justify-start gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-widest bg-white/5 px-3 py-1 rounded-xl w-fit mx-auto md:mx-0 border border-white/5">
                    <User size={12} />
                    {team.owner}
                  </div>
                </div>
                <div className="flex justify-center md:justify-start -space-x-4 overflow-hidden">
                  {team.pokemon.map((sprite, idx) => (
                    <div 
                      key={idx}
                      className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center relative z-0 hover:z-10 transition-all hover:scale-125 hover:shadow-2xl hover:border-indigo-500/50"
                    >
                      <img src={sprite} alt="pokemon" className="w-12 h-12 object-contain drop-shadow-xl" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Power Score */}
              <div className="flex-shrink-0 text-center bg-white/[0.02] px-10 py-5 rounded-[32px] border border-white/5 min-w-[160px] group-hover:bg-indigo-600/5 group-hover:border-indigo-500/20 transition-all">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 group-hover:text-indigo-400 transition-colors">Neural Rating</div>
                <div className="text-4xl font-black text-white tracking-tighter">{team.power_score}</div>
              </div>

              {/* Action */}
              <button 
                onClick={() => navigate('/community')}
                className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/5 text-slate-500 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all border border-white/5 group-hover:scale-105"
              >
                <ChevronRight size={24} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
