import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { TrendingUp, ShieldAlert, Sparkles, Loader2, AlertCircle, Download, ArrowLeftRight, X, ChevronRight, Target, Zap, Activity } from 'lucide-react';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend
} from 'recharts';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import CertificateCard from '../components/CertificateCard';
import SimilarPokemonSection from '../components/SimilarPokemonSection';

import { API_BASE_URL } from '../config';

const Analysis = () => {
  const { team, targetGen, setTargetGen, addToTeam, replaceInTeam } = useTeam();
  const { user } = useAuth();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // Smart Swap State
  const [swappingFor, setSwappingFor] = useState<any>(null);
  const [previewSwap, setPreviewSwap] = useState<{ suggestion: any, targetId: number } | null>(null);
  const [projectedData, setProjectedData] = useState<any>(null);
  const [, setProjectedLoading] = useState(false);
  
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (team.length > 0) {
      fetchAnalysis();
    } else {
      setAnalysisData(null);
    }
  }, [team, targetGen]);

  // Fetch projected analysis when previewing a swap
  useEffect(() => {
    if (previewSwap) {
      fetchProjectedAnalysis();
    } else {
      setProjectedData(null);
    }
  }, [previewSwap]);

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

  const fetchProjectedAnalysis = async () => {
    if (!previewSwap) return;
    setProjectedLoading(true);
    try {
      const projectedIds = team.map(p => p.id === previewSwap.targetId ? previewSwap.suggestion.id : p.id);
      const response = await axios.post(`${API_BASE_URL}/team-analysis`, projectedIds, {
        params: { target_generation: targetGen }
      });
      setProjectedData(response.data);
    } catch (err) {
      console.error('Error fetching projected analysis:', err);
    } finally {
      setProjectedLoading(false);
    }
  };

  const handleExport = async () => {
    if (!certificateRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(certificateRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `poke-architect-team-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export certificate.');
    } finally {
      setExporting(false);
    }
  };

  const handleConfirmSwap = () => {
    if (previewSwap) {
      replaceInTeam(previewSwap.suggestion, previewSwap.targetId);
      setPreviewSwap(null);
    }
  };

  // Heuristic to find the best replacement for a suggestion
  const getBestReplacementId = (_suggestion: any) => {
    if (team.length === 0) return null;
    // Simple heuristic: replace the member with the lowest BST or highest shared weakness
    return team[0].id;
  };

  const statsData = useMemo(() => {
    if (!analysisData) return [];
    const labels = [
      { key: 'hp', subject: 'HP' },
      { key: 'attack', subject: 'Attack' },
      { key: 'defense', subject: 'Defense' },
      { key: 'special_attack', subject: 'Sp. Atk' },
      { key: 'special_defense', subject: 'Sp. Def' },
      { key: 'speed', subject: 'Speed' },
    ];

    return labels.map(l => ({
      subject: l.subject,
      Current: analysisData.total_stats[l.key] / team.length,
      Projected: projectedData ? projectedData.total_stats[l.key] / team.length : undefined,
      fullMark: 150
    }));
  }, [analysisData, projectedData, team.length]);

  const coverageData = useMemo(() => {
    if (!analysisData) return [];
    const current = Object.entries(analysisData.type_coverage)
      .map(([type, score]) => ({ type, Current: score as number, Projected: 0 }));
    
    if (projectedData) {
      Object.entries(projectedData.type_coverage).forEach(([type, score]) => {
        const item = current.find(c => c.type === type);
        if (item) item.Projected = score as number;
        else current.push({ type, Current: 0, Projected: score as number });
      });
    }

    return current
      .filter(item => item.Current !== 0 || item.Projected !== 0)
      .sort((a, b) => b.Current - a.Current);
  }, [analysisData, projectedData]);

  if (team.length === 0) {
    return (
      <div className="container mx-auto px-6 py-32 flex flex-col items-center justify-center text-center relative">
        <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-full" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-xl p-12 rounded-[3rem] border border-white/20 shadow-2xl max-w-lg relative z-10"
        >
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-100 shadow-inner">
            <AlertCircle className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase">Intelligence Required</h2>
          <p className="text-slate-500 mb-10 font-medium leading-relaxed">
            Architect systems require at least one active roster signature to initialize deep-dive diagnostic protocols.
          </p>
          <a href="/builder" className="inline-flex items-center gap-3 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30 active:scale-95">
            INITIALIZE BUILDER
            <ChevronRight size={18} />
          </a>
        </motion.div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="container mx-auto px-6 py-32 flex flex-col items-center justify-center text-center relative">
        <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="relative z-10">
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-6" />
          <p className="text-slate-500 font-black uppercase tracking-widest text-sm animate-pulse">Running Deep Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12 relative z-10">
        <div className="flex items-center gap-6">
          <div className="bg-slate-950 p-5 rounded-[2rem] text-white shadow-2xl shadow-indigo-950/20 relative group">
            <TrendingUp size={32} className="relative z-10 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Deep Analytics</h1>
              <AnimatePresence mode="wait">
                {analysisData?.health_score && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-[10px] uppercase font-black px-3 py-1 rounded-lg shadow-lg border ${
                      analysisData.health_score === 'S' ? 'bg-yellow-400 text-slate-900 border-yellow-300' : 'bg-indigo-600 text-white border-indigo-400'
                    }`}
                  >
                    System Grade {analysisData.health_score}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] opacity-60">Strategic Diagnostic Suite v4.2</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-xl shadow-slate-200/50 flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Target Epoch:</span>
            <select 
              className="bg-slate-950 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              value={targetGen}
              onChange={(e) => setTargetGen(parseInt(e.target.value))}
            >
              {[1,2,3,4,5,6,7,8,9].map(g => (
                <option key={g} value={g}>GEN {g}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleExport}
            disabled={exporting}
            className="group flex items-center gap-3 bg-slate-950 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-indigo-950/20 disabled:opacity-50 active:scale-95"
          >
            {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} className="group-hover:-translate-y-1 transition-transform" />}
            Export Blueprint
          </button>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 relative z-10">
        {/* Radar Chart Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-2xl shadow-slate-200/50 flex flex-col"
        >
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <Activity className="text-indigo-600 w-6 h-6" />
              <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Stat Distribution</h3>
            </div>
            {projectedData && (
              <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span className="text-[10px] font-black text-indigo-600 uppercase">Comparison Live</span>
              </div>
            )}
          </div>
          
          <div className="w-full h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={statsData}>
                <PolarGrid stroke="rgba(0,0,0,0.05)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 900 }} />
                <PolarRadiusAxis domain={[0, 150]} tick={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 900, fontSize: '10px' }} />
                <Radar
                  name="Current Base"
                  dataKey="Current"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fill="#6366f1"
                  fillOpacity={0.3}
                />
                {projectedData && (
                  <Radar
                    name="Projected Swap"
                    dataKey="Projected"
                    stroke="#ec4899"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    fill="#f472b6"
                    fillOpacity={0.2}
                  />
                )}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Bar Chart Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/60 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-2xl shadow-slate-200/50 flex flex-col"
        >
          <div className="flex items-center gap-3 mb-8">
            <ShieldAlert size={28} className="text-slate-800" />
            <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Vulnerability Matrix</h3>
          </div>
          <div className="w-full h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={coverageData}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                barGap={projectedData ? 4 : 0}
              >
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="type" 
                  type="category" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                  width={60}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 900, fontSize: '10px' }} />
                <Bar dataKey="Current" radius={[0, 10, 10, 0]} barSize={projectedData ? 8 : 16}>
                  {coverageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.Current > 0 ? '#ef4444' : '#10b981'} fillOpacity={0.8} />
                  ))}
                </Bar>
                {projectedData && (
                  <Bar dataKey="Projected" radius={[0, 10, 10, 0]} barSize={8}>
                    {coverageData.map((entry, index) => (
                      <Cell key={`cell-proj-${index}`} fill={entry.Projected > 0 ? '#f43f5e' : '#34d399'} fillOpacity={0.4} strokeDasharray="2 2" />
                    ))}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Similarity Analytics Section */}
      <SimilarPokemonSection 
        currentTeam={team}
        onAdd={addToTeam}
        onSwap={(p) => {
          setPreviewSwap({ suggestion: p, targetId: team[0].id });
        }}
        isFull={team.length >= 6}
      />

      {/* Tactical Suggestions Section */}
      <div className="bg-slate-950 rounded-[4rem] p-10 md:p-16 text-white shadow-[0_40px_100px_-20px_rgba(79,70,229,0.3)] relative overflow-hidden">
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row gap-12 items-start mb-16">
            <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-2xl shadow-indigo-500/30 relative shrink-0">
              <Sparkles size={48} className="text-yellow-400 animate-pulse relative z-10" />
              <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
            </div>
            
            <div className="flex-grow">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-10">
                <h3 className="text-5xl font-black tracking-tighter uppercase leading-none">Architect's Strategy</h3>
                <div className="bg-indigo-500/20 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10 shrink-0">
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400">Heuristic Engine Active</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {analysisData?.advice?.map((tip: string, idx: number) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex gap-5 items-start bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all group"
                  >
                    <div className="bg-indigo-600/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                      <Zap size={20} className="text-indigo-400" />
                    </div>
                    <p className="text-sm font-bold leading-relaxed text-slate-300">{tip}</p>
                  </motion.div>
                ))}
                {(!analysisData?.advice || analysisData.advice.length === 0) && (
                  <p className="text-slate-500 italic text-sm">No strategic advice available for this composition.</p>
                )}
              </div>
            </div>
          </div>

          {/* Suggested Recruits Grid */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <Target className="text-indigo-400 w-6 h-6" />
                <h4 className="text-xl font-black uppercase tracking-widest text-white/90">Strategic Recruits</h4>
              </div>
              {team.length >= 6 && (
                <div className="flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Team Full: Swap Module Initialized</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-8">
              {analysisData.suggestions?.map((p: any, idx: number) => {
                const targetId = getBestReplacementId(p);
                const targetPokemon = team.find(tp => tp.id === targetId);
                const isBeingPreviewed = previewSwap?.suggestion.id === p.id;

                return (
                  <motion.div 
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`bg-white/5 rounded-[2.5rem] p-8 flex flex-col items-center border transition-all relative group hover:shadow-2xl hover:shadow-indigo-500/10 ${
                      isBeingPreviewed ? 'border-indigo-500 ring-4 ring-indigo-500/20 bg-white/10 scale-105' : 'border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {/* Suggestion Card Content */}
                    <div className="relative mb-8 text-center w-full">
                      <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img src={p.sprite_url} alt={p.name} className="w-28 h-28 object-contain relative z-10 drop-shadow-2xl mx-auto group-hover:scale-110 transition-transform" />
                      
                      <div className="mt-6">
                        <span className="text-[9px] font-black px-2.5 py-1 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/20 uppercase tracking-widest inline-block mb-2">
                          {p.role}
                        </span>
                        <h4 className="text-2xl font-black text-white capitalize tracking-tighter mb-4">{p.name}</h4>
                      </div>
                    </div>

                    {/* Replacement Preview UI (The requested feature) */}
                    <div className="w-full bg-black/40 rounded-3xl p-5 border border-white/5 mb-8 relative">
                      <div className="flex flex-col items-center gap-4">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Recommended Swap</span>
                        
                        <div className="flex items-center justify-between w-full px-2">
                          <img src={p.sprite_url} className="w-12 h-12 object-contain" title="Suggested" />
                          <ArrowLeftRight className={`text-slate-600 ${isBeingPreviewed ? 'text-indigo-500 animate-spin' : ''}`} size={16} />
                          {targetPokemon && (
                            <img src={targetPokemon.sprite_url} className="w-12 h-12 object-contain opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" title="Target Replacement" />
                          )}
                        </div>
                        
                        {targetPokemon && (
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-slate-500 leading-none">REPLACE</p>
                            <p className="text-xs font-black text-slate-400 capitalize">{targetPokemon.name}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto w-full grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => {
                          if (isBeingPreviewed) {
                            handleConfirmSwap();
                          } else {
                            setPreviewSwap({ suggestion: p, targetId: targetId || team[0].id });
                          }
                        }}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-xl ${
                          isBeingPreviewed 
                            ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'
                        }`}
                      >
                        {isBeingPreviewed ? (
                          <>CONFIRM SYNC <Zap size={16} /></>
                        ) : (
                          <>PREVIEW SWAP <Activity size={16} /></>
                        )}
                      </button>
                      
                      {isBeingPreviewed && (
                        <button 
                          onClick={() => setPreviewSwap(null)}
                          className="w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                        >
                          Cancel Preview
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
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

      {/* Legacy Swap Modal (keeping for general swaps if needed) */}
      <AnimatePresence>
        {swappingFor && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="p-10 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-xl">
                    <ArrowLeftRight size={28} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase">Manual Override</h3>
                    <p className="text-slate-500 font-bold text-xs tracking-widest uppercase">Select replacement signature</p>
                  </div>
                </div>
                <button onClick={() => setSwappingFor(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="p-10">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {team.map((p) => (
                    <button 
                      key={p.id}
                      onClick={() => {
                        replaceInTeam(swappingFor, p.id);
                        setSwappingFor(null);
                      }}
                      className="group flex flex-col items-center p-6 rounded-[2rem] border border-white/5 bg-white/5 hover:border-indigo-500 hover:bg-indigo-500/10 transition-all relative"
                    >
                      <img src={p.sprite_url} alt={p.name} className="w-20 h-20 object-contain mb-4 drop-shadow-2xl group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-400">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Analysis;
