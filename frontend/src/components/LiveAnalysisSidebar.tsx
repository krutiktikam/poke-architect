import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, ShieldAlert, Sparkles, Loader2, ArrowLeftRight, X, ChevronRight, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip
} from 'recharts';
import { useTeam } from '../context/TeamContext';
import { API_BASE_URL } from '../config';

const LiveAnalysisSidebar = () => {
  const { team, targetGen, addToTeam, replaceInTeam } = useTeam();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [swappingFor, setSwappingFor] = useState<any>(null);

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

  const handleSwap = (newPokemon: any, oldPokemonId: number) => {
    replaceInTeam(newPokemon, oldPokemonId);
    setSwappingFor(null);
  };

  if (team.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-950/50 backdrop-blur-sm border-l border-white/5"
      >
        <div className="relative mb-6">
          <Target className="w-16 h-16 text-slate-800 relative z-10" />
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute inset-0 bg-indigo-500 blur-3xl rounded-full"
          />
        </div>
        <h3 className="text-xl font-black text-white mb-3 tracking-tight uppercase">No Data Seeded</h3>
        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-[200px]">
          Begin building your roster to initialize the strategic analysis engine.
        </p>
      </motion.div>
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
    <div className="h-full overflow-y-auto bg-slate-950 border-l border-white/10 p-6 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="text-indigo-400 w-4 h-4" />
            <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em]">Real-time Logic</h2>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter">SYNERGY REPORT</h1>
        </div>
        
        <AnimatePresence>
          {analysisData?.health_score && (
            <motion.div 
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shadow-2xl border ${
                analysisData.health_score === 'S' ? 'bg-yellow-400 border-yellow-300 text-slate-900 shadow-yellow-500/20' :
                analysisData.health_score === 'A' ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-500/20' :
                analysisData.health_score === 'B' ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20' :
                analysisData.health_score === 'C' ? 'bg-orange-500 border-orange-400 text-white shadow-orange-500/20' :
                'bg-red-600 border-red-400 text-white shadow-red-500/20'
              }`}
            >
              <span className="text-[10px] uppercase opacity-60 leading-none mb-0.5 font-bold">Grade</span>
              <span className="text-2xl leading-none">{analysisData.health_score}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading && !analysisData ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Compiling Analytics...</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Stats Radar */}
          <section>
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base Statistics Matrix</span>
            </div>
            <div className="w-full h-64 bg-white/5 rounded-3xl p-4 border border-white/5">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={statsData}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 900 }} />
                  <PolarRadiusAxis domain={[0, 150]} tick={false} axisLine={false} />
                  <Radar name="Team" dataKey="A" stroke="#6366f1" strokeWidth={3} fill="#6366f1" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Type Coverage */}
          <section>
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-red-400 w-4 h-4" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-red-400/80">Vulnerability Map</span>
              </div>
            </div>
            <div className="w-full h-64 bg-white/5 rounded-3xl p-4 border border-white/5 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageData} layout="vertical" margin={{ left: -10, top: 0, bottom: 0, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="type" type="category" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 900 }} width={60} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={12}>
                    {coverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score > 0 ? '#ef4444' : '#10b981'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Archetype & Advice */}
          <AnimatePresence mode="wait">
            {analysisData?.advice && analysisData.advice.length > 0 && (
              <motion.section 
                key={analysisData.archetype}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-indigo-600/10 rounded-3xl p-6 border border-indigo-500/20 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Sparkles size={48} className="text-indigo-400" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{analysisData.archetype || 'Analyzing'} Detected</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                  "{analysisData.advice[0]}"
                </p>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Recommendations */}
          {analysisData?.suggestions && analysisData.suggestions.length > 0 && (
            <section className="pt-8 border-t border-white/5">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="text-yellow-400 w-4 h-4" />
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Architect Suggestions</h3>
              </div>
              <div className="space-y-4">
                {analysisData.suggestions.map((p: any, idx: number) => (
                  <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group relative bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-indigo-500/50 hover:bg-white/10 transition-all cursor-default"
                  >
                    <div className="flex gap-4">
                      <div className="relative">
                        <div className={`absolute inset-0 bg-indigo-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity`} />
                        <img src={p.sprite_url} alt={p.name} className="w-14 h-14 object-contain relative z-10 drop-shadow-lg" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-sm font-black text-white capitalize truncate pr-2">{p.name}</h4>
                          <span className="shrink-0 text-[8px] font-black px-2 py-0.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/20 uppercase tracking-widest">
                            {p.role}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {p.reasoning.map((reason: string, i: number) => (
                            <span key={i} className="text-[9px] font-bold text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded-md border border-white/5">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (team.length >= 6) {
                            setSwappingFor(p);
                          } else {
                            addToTeam(p);
                          }
                        }}
                        className={`shrink-0 self-center w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          team.length >= 6 
                            ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/20' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
                        }`}
                        title={team.length >= 6 ? "Swap & Compare" : "Add to Team"}
                      >
                        {team.length >= 6 ? <ArrowLeftRight className="w-5 h-5" /> : <ChevronRight className="w-6 h-6" />}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Swap UI Overlay */}
          <AnimatePresence>
            {swappingFor && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[60] flex items-center justify-center p-6"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-lg shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden"
                >
                  <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-indigo-600/10 to-transparent">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/30">
                        <ArrowLeftRight className="text-white w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-2xl font-black text-white tracking-tight">System Swap</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Optimizing Strategic Vector</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSwappingFor(null)} 
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    <div className="flex items-center justify-between gap-6 px-4">
                      <div className="flex flex-col items-center gap-4 flex-1">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150" />
                          <div className="w-28 h-28 bg-white/5 rounded-3xl flex items-center justify-center relative z-10 border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500">
                            <img src={swappingFor.sprite_url} alt={swappingFor.name} className="w-24 h-24 object-contain drop-shadow-2xl" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">New Recruit</p>
                          <p className="text-xl font-black text-white capitalize leading-tight">{swappingFor.name}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <motion.div 
                          animate={{ x: [0, 10, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                          <ChevronRight size={32} className="text-slate-700" />
                        </motion.div>
                        <div className="w-px h-12 bg-gradient-to-b from-transparent via-slate-800 to-transparent" />
                      </div>

                      <div className="flex flex-col items-center gap-4 flex-1">
                        <div className="w-28 h-28 bg-white/5 rounded-3xl flex items-center justify-center border border-dashed border-white/10 opacity-40">
                          <Target size={40} className="text-slate-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Slot</p>
                          <p className="text-sm font-bold text-slate-400">Select Member</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 pt-4">
                      {team.map((p) => (
                        <button 
                          key={p.id}
                          onClick={() => handleSwap(swappingFor, p.id)}
                          className="flex flex-col items-center p-3 rounded-2xl border border-white/5 bg-white/5 hover:border-indigo-500 hover:bg-indigo-500/10 transition-all group"
                        >
                          <img src={p.sprite_url} alt={p.name} className="w-12 h-12 object-contain mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-black text-slate-400 capitalize group-hover:text-indigo-400 tracking-wider truncate w-full text-center">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default LiveAnalysisSidebar;
