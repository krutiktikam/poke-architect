import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Loader2, ArrowLeftRight, X, ChevronRight, Target } from 'lucide-react';
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
        className="h-full flex flex-col items-center justify-center p-12 text-center bg-[#0f111a]/40 backdrop-blur-md border-l border-white/5"
      >
        <div className="relative mb-8">
          <Target className="w-16 h-16 text-slate-800 relative z-10 opacity-20" />
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.05, 0.1, 0.05] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute inset-0 bg-indigo-500 blur-3xl rounded-full"
          />
        </div>
        <h3 className="text-xl font-black text-white/40 mb-3 tracking-tighter uppercase">No Signal Detected</h3>
        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-[200px]">
          Initialize roster to begin strategic synthesis.
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
    <div className="h-full overflow-y-auto bg-[#0f111a]/60 backdrop-blur-3xl border-l border-white/5 p-8 custom-scrollbar relative">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-12 relative z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Analysis Engine</h2>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter">SYNERGY REPORT</h1>
        </div>
        
        <AnimatePresence>
          {analysisData?.health_score && (
            <motion.div 
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shadow-2xl border ${
                analysisData.health_score === 'S' ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-500/20' :
                analysisData.health_score === 'A' ? 'bg-white/10 border-white/10 text-white shadow-white/5' :
                'bg-white/5 border-white/5 text-white/40'
              }`}
            >
              <span className="text-[8px] uppercase opacity-40 leading-none mb-0.5 font-black tracking-widest">Rank</span>
              <span className="text-2xl leading-none">{analysisData.health_score}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading && !analysisData ? (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
          </div>
          <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.3em]">Synthesizing Data...</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12 relative z-10"
        >
          {/* Stats Radar */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Statistical Matrix</span>
              <div className="flex-grow h-px bg-white/5" />
            </div>
            <div className="w-full h-64 bg-white/[0.02] rounded-3xl p-4 border border-white/5 group">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={statsData}>
                  <PolarGrid stroke="rgba(255,255,255,0.03)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }} />
                  <PolarRadiusAxis domain={[0, 150]} tick={false} axisLine={false} />
                  <Radar name="Team" dataKey="A" stroke="#6366f1" strokeWidth={2} fill="#6366f1" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Type Coverage */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Threat Vectors</span>
              <div className="flex-grow h-px bg-white/5" />
            </div>
            <div className="w-full h-64 bg-white/[0.02] rounded-3xl p-4 border border-white/5 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageData} layout="vertical" margin={{ left: -10, top: 0, bottom: 0, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="type" type="category" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 900, letterSpacing: '0.1em' }} width={60} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#0f111a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#fff', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}
                  />
                  <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={10}>
                    {coverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score > 0 ? '#6366f1' : '#10b981'} fillOpacity={0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Archetype & Advice */}
          <AnimatePresence mode="wait">
            {analysisData?.advice && analysisData?.advice?.length > 0 && (
              <motion.section 
                key={analysisData.archetype}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-indigo-600/5 rounded-[28px] p-6 border border-indigo-500/10 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform">
                  <Sparkles size={64} className="text-indigo-400" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">{analysisData.archetype || 'Detecting'} Pattern</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-bold italic tracking-wide">
                  "{analysisData?.advice?.[0]}"
                </p>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Recommendations */}
          {analysisData?.suggestions && analysisData.suggestions.length > 0 && (
            <section className="pt-8 border-t border-white/5">
              <div className="flex items-center gap-2 mb-8">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Neural Suggestions</span>
                <div className="flex-grow h-px bg-white/5" />
              </div>
              <div className="space-y-4">
                {analysisData.suggestions.map((p: any, idx: number) => (
                  <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group relative bg-white/[0.01] border border-white/5 rounded-2xl p-4 hover:border-indigo-500/30 hover:bg-white/[0.03] transition-all cursor-default"
                  >
                    <div className="flex gap-4">
                      <div className="relative">
                        <div className={`absolute inset-0 bg-indigo-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity`} />
                        <img src={p.sprite_url} alt={p.name} className="w-14 h-14 object-contain relative z-10 drop-shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-500" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-black text-white capitalize truncate pr-2 tracking-tight">{p.name}</h4>
                          <span className="shrink-0 text-[7px] font-black px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 uppercase tracking-[0.1em]">
                            {p.role}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {p.reasoning.map((reason: string, i: number) => (
                            <span key={i} className="text-[8px] font-black text-slate-500 bg-black/20 px-2 py-0.5 rounded-md border border-white/5 uppercase tracking-tighter">
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
                            ? 'bg-white/5 text-slate-500 hover:text-white border border-white/5' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
                        }`}
                      >
                        {team.length >= 6 ? <ArrowLeftRight className="w-4 h-4" /> : <ChevronRight className="w-5 h-5" />}
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
                className="fixed inset-0 bg-[#0f111a]/95 backdrop-blur-2xl z-[60] flex items-center justify-center p-6"
              >
                <motion.div 
                  initial={{ scale: 0.95, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 10 }}
                  className="bg-white/[0.02] border border-white/10 rounded-[40px] w-full max-w-lg shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] overflow-hidden"
                >
                  <div className="p-10 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-indigo-600/10 to-transparent">
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-indigo-600 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                        <ArrowLeftRight className="text-white w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-2xl font-black text-white tracking-tighter">System Swap</h3>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Optimizing Roster Matrix</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSwappingFor(null)} 
                      className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-slate-500 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-10 space-y-10">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex flex-col items-center gap-6 flex-1">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-125 opacity-50 group-hover:opacity-100 transition-opacity" />
                          <div className="w-32 h-32 bg-white/[0.03] rounded-[32px] flex items-center justify-center relative z-10 border border-white/10 group-hover:scale-105 transition-transform duration-500">
                            <img src={swappingFor.sprite_url} alt={swappingFor.name} className="w-24 h-24 object-contain drop-shadow-2xl" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2">New Candidate</p>
                          <p className="text-xl font-black text-white tracking-tight leading-none">{swappingFor.name}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <motion.div 
                          animate={{ x: [0, 8, 0] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <ChevronRight size={32} className="text-white/10" />
                        </motion.div>
                      </div>

                      <div className="flex flex-col items-center gap-6 flex-1">
                        <div className="w-32 h-32 bg-white/[0.01] rounded-[32px] flex items-center justify-center border border-dashed border-white/5 opacity-20">
                          <Target size={40} className="text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2">Target Node</p>
                          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Select Target</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {team.map((p) => (
                        <button 
                          key={p.id}
                          onClick={() => handleSwap(swappingFor, p.id)}
                          className="flex flex-col items-center p-4 rounded-3xl border border-white/5 bg-white/[0.01] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                        >
                          <img src={p.sprite_url} alt={p.name} className="w-12 h-12 object-contain mb-3 grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all" />
                          <span className="text-[9px] font-black text-slate-500 capitalize group-hover:text-indigo-400 tracking-[0.1em] truncate w-full text-center">{p.name}</span>
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
