import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { X, TrendingUp, ShieldAlert, Sparkles } from 'lucide-react';
import type { Pokemon } from '../types';

interface AnalysisDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  analysisData: any;
  team: Pokemon[];
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ isOpen, onClose, analysisData, team }) => {
  if (!isOpen) return null;

  const teamSize = team.length || 1; // Prevent division by zero

  const statsData = [
    { subject: 'HP', A: (analysisData.total_stats.hp || 0) / teamSize, fullMark: 150 },
    { subject: 'Attack', A: (analysisData.total_stats.attack || 0) / teamSize, fullMark: 150 },
    { subject: 'Defense', A: (analysisData.total_stats.defense || 0) / teamSize, fullMark: 150 },
    { subject: 'Sp. Atk', A: (analysisData.total_stats.special_attack || 0) / teamSize, fullMark: 150 },
    { subject: 'Sp. Def', A: (analysisData.total_stats.special_defense || 0) / teamSize, fullMark: 150 },
    { subject: 'Speed', A: (analysisData.total_stats.speed || 0) / teamSize, fullMark: 150 },
  ];

  const coverageData = Object.entries(analysisData.type_coverage)
    .map(([type, score]) => ({ type, score: score as number }))
    .filter(item => item.score !== 0)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 bg-[#0f111a]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#161927] border border-white/10 rounded-[40px] w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col custom-scrollbar">
        <div className="p-8 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#161927]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500/20 p-3 rounded-2xl text-indigo-400">
              <TrendingUp size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight m-0 uppercase">Sync Analysis</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Real-time team performance metrics</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white border border-white/5"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Radar Chart for Stats */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 flex flex-col items-center">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8 self-start">Average Base Stats</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={statsData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                  <Radar
                    name="Team Average"
                    dataKey="A"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fill="#6366f1"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Type Weakness/Resistance Bar Chart */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <ShieldAlert size={20} className="text-indigo-400" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] m-0">Type Vulnerabilities</h3>
            </div>
            <div className="w-full h-80">
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
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  />
                  <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                    {coverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score > 0 ? '#ef4444' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Tactical Suggestions */}
          <div className="lg:col-span-2 bg-indigo-500/5 rounded-[32px] p-8 border border-indigo-500/20">
            <div className="flex items-center gap-3 mb-8">
              <Sparkles size={24} className="text-indigo-400" />
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider m-0">Recommended Additions</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Tactical reinforcement suggestions</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {analysisData.suggestions?.map((p: any) => (
                <div key={p.id} className="bg-white/[0.03] hover:bg-white/[0.08] transition-all rounded-3xl p-5 border border-white/5 flex flex-col items-center relative group cursor-help">
                  {p.tier && p.tier !== 'N/A' && (
                    <span className="absolute top-3 right-3 text-[7px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-black">
                      {p.tier}
                    </span>
                  )}
                  <img src={p.sprite_url} alt={p.name} className="w-20 h-20 object-contain mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-black text-white uppercase tracking-wider truncate w-full text-center">{p.name}</span>
                  <div className="flex gap-1 mt-2">
                    <span className="text-[7px] font-bold text-slate-500 uppercase">{p.type1}</span>
                    {p.type2 && <span className="text-[7px] font-bold text-slate-500 uppercase">/ {p.type2}</span>}
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

export default AnalysisDashboard;
