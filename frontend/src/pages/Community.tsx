import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Loader2, MessageSquare, ChevronRight, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useTeam } from '../context/TeamContext';
import CompareModal from '../components/CompareModal';

const Community = () => {
  const { team: myTeam } = useTeam();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [myAnalysis, setMyAnalysis] = useState<any>(null);
  const [theirAnalysis, setTheirAnalysis] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchPublicTeams();
  }, []);

  const fetchPublicTeams = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teams/public`);
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching public teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async (team: any) => {
    if (myTeam.length === 0) {
      alert('Add at least one Pokémon to your team to compare!');
      return;
    }
    setComparing(true);
    setSelectedTeam(team);
    try {
      const [myRes, theirRes] = await Promise.all([
        axios.post(`${API_BASE_URL}/team-analysis`, myTeam.map(p => p.id)),
        axios.post(`${API_BASE_URL}/team-analysis`, team.pokemon_ids)
      ]);
      setMyAnalysis(myRes.data);
      setTheirAnalysis(theirRes.data);
      setIsCompareOpen(true);
    } catch (error) {
      console.error('Error comparing teams:', error);
      alert('Failed to analyze teams for comparison.');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg">
          <Users size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Community Showcase</h1>
          <p className="text-slate-500 font-medium">Top-rated teams from architects worldwide</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 font-bold italic text-lg">Loading masterpieces...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-slate-100 shadow-sm">
          <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">The arena is quiet...</h2>
          <p className="text-slate-500">Be the first to share a public team from the Builder!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{team.name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                      BY <span className="text-slate-600">{team.owner}</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 border border-slate-100 uppercase">
                    Public Team
                  </div>
                </div>

                <div className="flex gap-2 justify-center py-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                  {team.pokemon.map((sprite: string, idx: number) => (
                    <img 
                      key={idx} 
                      src={sprite} 
                      alt="pokemon" 
                      className="w-12 h-12 object-contain drop-shadow-md hover:scale-125 transition-transform" 
                    />
                  ))}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleCompare(team)}
                    disabled={comparing}
                    className="flex-grow flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                  >
                    {comparing && selectedTeam?.id === team.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Zap size={16} className="text-yellow-400 fill-current" />
                    )}
                    COMPARE TEAMS
                  </button>
                  <button className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 hover:text-slate-600 transition-all">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCompareOpen && (
        <CompareModal 
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          myTeam={myTeam}
          theirTeam={selectedTeam?.pokemon_ids || []}
          myAnalysis={myAnalysis}
          theirAnalysis={theirAnalysis}
        />
      )}
    </div>
  );
};

export default Community;
