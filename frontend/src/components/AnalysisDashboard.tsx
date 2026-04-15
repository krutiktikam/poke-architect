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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 text-slate-900">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <TrendingUp size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 m-0">Team Analysis</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Radar Chart for Stats */}
          <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center">
            <h3 className="text-lg font-bold text-slate-700 mb-4 self-start">Average Base Stats</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={statsData}>
                  <PolarGrid stroke="#cbd5e1" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                  <Radar
                    name="Team Average"
                    dataKey="A"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fill="#6366f1"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Type Weakness/Resistance Bar Chart */}
          <div className="bg-slate-50 rounded-xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={20} className="text-slate-700" />
              <h3 className="text-lg font-bold text-slate-700 m-0">Type Vulnerabilities</h3>
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
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
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
          
          {/* AI Suggestions */}
          <div className="lg:col-span-2 bg-indigo-50 rounded-xl p-6 border border-indigo-100">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-indigo-600" />
              <h3 className="text-lg font-bold text-indigo-900 m-0">Suggested Additions</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {analysisData.suggestions?.map((p: any) => (
                <div key={p.id} className="bg-white rounded-lg p-3 border border-indigo-100 flex flex-col items-center">
                  <img src={p.sprite_url} alt={p.name} className="w-16 h-16 object-contain mb-2" />
                  <span className="text-xs font-bold text-slate-800 capitalize truncate w-full text-center">{p.name}</span>
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
