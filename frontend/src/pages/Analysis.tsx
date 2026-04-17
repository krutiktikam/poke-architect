import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, ShieldAlert, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { useTeam } from '../context/TeamContext';

import { API_BASE_URL } from '../config';

const Analysis = () => {
  const { team, targetGen, setTargetGen } = useTeam();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (team.length > 0) {
      fetchAnalysis();
    } else {
      setAnalysisData(null);
    }
  }, [team, targetGen]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/team-analysis`, team.map(p => p.id), {
        params: { target_generation: targetGen }
      });
      setAnalysisData(response.data);
    } catch (err) {
      console.error('Error analyzing team:', err);
      setError('Failed to analyze team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (team.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
        <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm max-w-md">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Empty Team</h2>
          <p className="text-slate-500 mb-8">You need at least one Pokémon in your team to perform a deep-dive analysis.</p>
          <a href="/" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            Go to Builder
          </a>
        </div>
      </div>
    );
  }

  if (loading && !analysisData) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Running deep-dive diagnostics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <button onClick={fetchAnalysis} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!analysisData) return null;

  const statsData = [
    { subject: 'HP', A: analysisData.total_stats.hp / team.length, fullMark: 150 },
    { subject: 'Attack', A: analysisData.total_stats.attack / team.length, fullMark: 150 },
    { subject: 'Defense', A: analysisData.total_stats.defense / team.length, fullMark: 150 },
    { subject: 'Sp. Atk', A: analysisData.total_stats.special_attack / team.length, fullMark: 150 },
    { subject: 'Sp. Def', A: analysisData.total_stats.special_defense / team.length, fullMark: 150 },
    { subject: 'Speed', A: analysisData.total_stats.speed / team.length, fullMark: 150 },
  ];

  const coverageData = Object.entries(analysisData.type_coverage)
    .map(([type, score]) => ({ type, score: score as number }))
    .filter(item => item.score !== 0)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 shadow-sm">
            <TrendingUp size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-800">Team Analysis</h1>
              {analysisData?.archetype && (
                <span className="bg-indigo-600 text-white text-[10px] uppercase font-black px-3 py-1 rounded-full shadow-lg shadow-indigo-100">
                  {analysisData.archetype}
                </span>
              )}
            </div>
            <p className="text-slate-500 font-medium">Strategic overview of your current roster</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase ml-2">Target Game:</span>
          <select 
            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none"
            value={targetGen}
            onChange={(e) => setTargetGen(parseInt(e.target.value))}
          >
            {[1,2,3,4,5,6,7,8,9].map(g => (
              <option key={g} value={g}>Generation {g}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Radar Chart for Stats */}
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col items-center">
          <h3 className="text-xl font-bold text-slate-800 mb-6 self-start">Average Base Stats</h3>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={statsData}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 14, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                <Radar
                  name="Team Average"
                  dataKey="A"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fill="#6366f1"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Type Weakness/Resistance Bar Chart */}
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <ShieldAlert size={24} className="text-slate-800" />
            <h3 className="text-xl font-bold text-slate-800 m-0">Type Vulnerabilities</h3>
          </div>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={coverageData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="type" 
                  type="category" 
                  tick={{ fill: '#64748b', fontSize: 14, fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {coverageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score > 0 ? '#ef4444' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Tactical Advice & Suggestions */}
      <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="flex-shrink-0 bg-white/20 p-4 rounded-2xl backdrop-blur-md">
            <Sparkles size={40} className="text-white" />
          </div>
          <div className="flex-grow">
            <h3 className="text-2xl font-bold mb-2">Architect's Tactical Suggestions</h3>
            
            {/* Advice List */}
            {analysisData.advice && analysisData.advice.length > 0 && (
              <div className="mb-6 space-y-2">
                {analysisData.advice.map((tip: string, idx: number) => (
                  <div key={idx} className="flex gap-2 items-start bg-indigo-500/30 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                    <TrendingUp size={16} className="mt-1 flex-shrink-0" />
                    <p className="text-sm font-medium">{tip}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-indigo-100 mb-6 font-medium max-w-2xl">
              Based on your team's current composition, we've identified key gaps in your coverage. 
              Adding one of these Pokémon would significantly improve your tactical balance.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {analysisData.suggestions?.map((p: any) => (
                <div key={p.id} className="bg-white/10 hover:bg-white/20 transition-all rounded-2xl p-4 flex flex-col items-center border border-white/10 backdrop-blur-sm group">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full scale-0 group-hover:scale-100 transition-transform duration-500"></div>
                    <img src={p.sprite_url} alt={p.name} className="w-20 h-20 object-contain mb-3 relative z-10 drop-shadow-lg" />
                  </div>
                  <span className="text-sm font-bold capitalize truncate w-full text-center">{p.name}</span>
                  <div className="flex gap-1 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/50 uppercase font-bold">{p.type1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
