import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { TrendingUp, ShieldAlert, Sparkles, Loader2, AlertCircle, Download, ArrowLeftRight, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import CertificateCard from '../components/CertificateCard';

import { API_BASE_URL } from '../config';

const Analysis = () => {
  const { team, targetGen, setTargetGen, addToTeam, replaceInTeam } = useTeam();
  const { user } = useAuth();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [swappingFor, setSwappingFor] = useState<any>(null);
  
  const certificateRef = useRef<HTMLDivElement>(null);

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

  const handleSwap = (newPokemon: any, oldPokemonId: number) => {
    replaceInTeam(newPokemon, oldPokemonId);
    setSwappingFor(null);
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

        <button 
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
        >
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          EXPORT CERTIFICATE
        </button>
      </div>

      {/* Hidden Certificate Card for Export */}
      <div className="fixed left-[-9999px] top-0">
        <CertificateCard 
          ref={certificateRef}
          team={team}
          analysis={analysisData}
          userName={user?.name}
        />
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
      
      {/* Swap UI Overlay */}
      {swappingFor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
                  <ArrowLeftRight size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Swap & Compare</h3>
                  <p className="text-slate-500 font-medium text-sm">Select a member to replace</p>
                </div>
              </div>
              <button onClick={() => setSwappingFor(null)} className="p-3 hover:bg-slate-200/50 rounded-2xl transition-all">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-center gap-12">
                <div className="text-center group">
                  <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center mb-4 border-2 border-indigo-100 shadow-xl shadow-indigo-50 relative overflow-hidden transition-all group-hover:scale-105">
                    <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <img src={swappingFor.sprite_url} alt={swappingFor.name} className="w-20 h-20 object-contain relative z-10" />
                  </div>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">New Recruit</p>
                  <p className="text-lg font-black text-slate-800 capitalize">{swappingFor.name}</p>
                </div>
                
                <ArrowLeftRight className="text-slate-200 w-12 h-12 animate-pulse" />
                
                <div className="text-center">
                  <div className="w-28 h-28 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 border-2 border-dashed border-slate-200 shadow-inner">
                    <span className="text-slate-300 text-4xl font-black opacity-50">?</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target</p>
                  <p className="text-lg font-black text-slate-300">Choice</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {team.map((p) => (
                  <button 
                    key={p.id}
                    onClick={() => handleSwap(swappingFor, p.id)}
                    className="group flex flex-col items-center p-4 rounded-3xl border border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-lg hover:shadow-indigo-100 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                    </div>
                    <img src={p.sprite_url} alt={p.name} className="w-16 h-16 object-contain mb-2 drop-shadow-md group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black text-slate-600 capitalize group-hover:text-indigo-600">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tactical Advice & Suggestions */}
      <div className="bg-indigo-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center lg:items-start">
          <div className="flex-shrink-0 bg-white/10 p-6 rounded-3xl backdrop-blur-xl border border-white/20 shadow-xl">
            <Sparkles size={48} className="text-yellow-400 animate-pulse" />
          </div>
          
          <div className="flex-grow">
            <div className="flex flex-col md:flex-row md:items-end gap-4 mb-8">
              <h3 className="text-4xl font-black tracking-tight">Architect's Tactical Suggestions</h3>
              <div className="bg-white/20 px-4 py-1 rounded-full backdrop-blur-md border border-white/10">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-100">Live Optimization</span>
              </div>
            </div>
            
            {/* Advice List */}
            {analysisData.advice && analysisData.advice.length > 0 && (
              <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisData.advice.map((tip: string, idx: number) => (
                  <div key={idx} className="flex gap-4 items-start bg-white/10 p-5 rounded-[1.5rem] border border-white/10 backdrop-blur-sm hover:bg-white/15 transition-all">
                    <div className="bg-white/20 p-2 rounded-xl mt-0.5">
                      <TrendingUp size={18} className="text-indigo-100" />
                    </div>
                    <p className="text-sm font-bold leading-relaxed text-indigo-50">{tip}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-6 flex items-center justify-between">
              <p className="text-indigo-100 font-bold max-w-2xl text-lg">
                Recommended Strategic Recruits
              </p>
              {team.length >= 6 && (
                <span className="bg-amber-400/20 text-amber-200 text-[10px] font-black px-3 py-1 rounded-full border border-amber-400/30 uppercase tracking-tighter">
                  Team Full: Swap Mode Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
              {analysisData.suggestions?.map((p: any) => (
                <div key={p.id} className="bg-white rounded-3xl p-6 flex flex-col items-center border border-white/10 shadow-xl group hover:scale-[1.02] transition-all relative overflow-hidden">
                  <div className="absolute top-4 right-4 z-20">
                    <button 
                      onClick={() => {
                        if (team.length >= 6) {
                          setSwappingFor(p);
                        } else {
                          addToTeam(p);
                        }
                      }}
                      className={`p-2.5 rounded-2xl shadow-lg transition-all hover:scale-110 active:scale-95 ${
                        team.length >= 6 
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                      }`}
                      title={team.length >= 6 ? "Swap Member" : "Add to Team"}
                    >
                      {team.length >= 6 ? <ArrowLeftRight size={18} /> : <Sparkles size={18} />}
                    </button>
                  </div>
                  
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-indigo-50 rounded-full scale-110 group-hover:scale-125 transition-transform duration-500 opacity-50"></div>
                    <img src={p.sprite_url} alt={p.name} className="w-24 h-24 object-contain relative z-10 drop-shadow-xl group-hover:rotate-6 transition-transform" />
                  </div>
                  
                  <div className="text-center w-full relative z-10">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg uppercase tracking-tighter mb-2 inline-block">
                      {p.role}
                    </span>
                    <h4 className="text-lg font-black text-slate-800 capitalize mb-3 truncate">{p.name}</h4>
                    
                    <div className="flex flex-col gap-2">
                      {p.reasoning.map((reason: string, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                          <span className="text-[10px] font-bold text-slate-500 leading-none">
                            {reason}
                          </span>
                        </div>
                      ))}
                    </div>
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
