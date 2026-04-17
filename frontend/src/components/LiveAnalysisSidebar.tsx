import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, ShieldAlert, Sparkles, Loader2, Info } from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Cell
} from 'recharts';
import { useTeam } from '../context/TeamContext';
import { API_BASE_URL } from '../config';

const LiveAnalysisSidebar = () => {
  const { team, targetGen } = useTeam();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (team.length > 0) {
      fetchAnalysis();
    } else {
      setAnalysisData(null);
    }
  }, [team, targetGen]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/team-analysis`, team.map(p => p.id), {
        params: { target_generation: targetGen }
      });
      setAnalysisData(response.data);
    } catch (err) {
      console.error('Error analyzing team:', err);
    } finally {
      setLoading(false);
    }
  };

  if (team.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white border-l border-slate-200">
        <Info className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">No Pokémon Added</h3>
        <p className="text-slate-500 text-sm">Add Pokémon to your team to see live strategic analysis and type coverage.</p>
      </div>
    );
  }

  const statsData = analysisData ? [
    { subject: 'HP', A: analysisData.total_stats.hp / team.length, fullMark: 150 },
    { subject: 'Atk', A: analysisData.total_stats.attack / team.length, fullMark: 150 },
    { subject: 'Def', A: analysisData.total_stats.defense / team.length, fullMark: 150 },
    { subject: 'SpA', A: analysisData.total_stats.special_attack / team.length, fullMark: 150 },
    { subject: 'SpD', A: analysisData.total_stats.special_defense / team.length, fullMark: 150 },
    { subject: 'Spe', A: analysisData.total_stats.speed / team.length, fullMark: 150 },
  ] : [];

  const coverageData = analysisData ? Object.entries(analysisData.type_coverage)
    .map(([type, score]) => ({ type, score: score as number }))
    .filter(item => item.score !== 0)
    .sort((a, b) => b.score - a.score) : [];

  return (
    <div className="h-full overflow-y-auto bg-white border-l border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-indigo-600 w-5 h-5" />
          <h2 className="text-xl font-bold text-slate-800">Live Analysis</h2>
        </div>
        {analysisData?.health_score && (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xl shadow-lg border-2 ${
            analysisData.health_score === 'S' ? 'bg-yellow-400 border-yellow-500 text-white' :
            analysisData.health_score === 'A' ? 'bg-indigo-500 border-indigo-600 text-white' :
            analysisData.health_score === 'B' ? 'bg-green-500 border-green-600 text-white' :
            analysisData.health_score === 'C' ? 'bg-orange-500 border-orange-600 text-white' :
            'bg-red-500 border-red-600 text-white'
          }`}>
            {analysisData.health_score}
          </div>
        )}
      </div>

      {loading && !analysisData ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
          <p className="text-slate-500 text-xs">Updating...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats Radar */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Average Base Stats</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={statsData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis domain={[0, 150]} tick={false} axisLine={false} />
                  <Radar name="Team" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Type Coverage */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="text-slate-400 w-4 h-4" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Vulnerabilities</h3>
            </div>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageData} layout="vertical" margin={{ left: -20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="type" type="category" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {coverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score > 0 ? '#ef4444' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Archetype & Advice */}
          {analysisData && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-indigo-600 w-4 h-4" />
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-tight">{analysisData.archetype} Team</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                {analysisData.advice[0]}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveAnalysisSidebar;
