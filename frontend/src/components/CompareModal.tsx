import React from 'react';
import { X, Zap, ShieldAlert, TrendingUp } from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  myTeam: any;
  theirTeam: any;
  myAnalysis: any;
  theirAnalysis: any;
  comparisonData: any;
}

const CompareModal: React.FC<CompareModalProps> = ({ 
  isOpen, onClose, myTeam, theirTeam, myAnalysis, theirAnalysis, comparisonData 
}) => {
  if (!isOpen) return null;

  const statsData = [
    { subject: 'HP', A: myAnalysis.total_stats.hp / myTeam.length, B: theirAnalysis.total_stats.hp / theirTeam.length, fullMark: 150 },
    { subject: 'Atk', A: myAnalysis.total_stats.attack / myTeam.length, B: theirAnalysis.total_stats.attack / theirTeam.length, fullMark: 150 },
    { subject: 'Def', A: myAnalysis.total_stats.defense / myTeam.length, B: theirAnalysis.total_stats.defense / theirTeam.length, fullMark: 150 },
    { subject: 'SpA', A: myAnalysis.total_stats.special_attack / myTeam.length, B: theirAnalysis.total_stats.special_attack / theirTeam.length, fullMark: 150 },
    { subject: 'SpD', A: myAnalysis.total_stats.special_defense / myTeam.length, B: theirAnalysis.total_stats.special_defense / theirTeam.length, fullMark: 150 },
    { subject: 'Spe', A: myAnalysis.total_stats.speed / myTeam.length, B: theirAnalysis.total_stats.speed / theirTeam.length, fullMark: 150 },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 p-2 rounded-xl text-white shadow-lg">
              <Zap size={24} className="fill-current" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 m-0 uppercase tracking-tight">Battle Simulation</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8">
          {/* Win Probability Bar */}
          <div className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <div className="text-left">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">My Win Chance</span>
                <div className="text-4xl font-black text-indigo-600">{(comparisonData.team_a_win_prob * 100).toFixed(0)}%</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest block mb-1">Their Win Chance</span>
                <div className="text-4xl font-black text-yellow-600">{(comparisonData.team_b_win_prob * 100).toFixed(0)}%</div>
              </div>
            </div>
            <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
                style={{ width: `${comparisonData.team_a_win_prob * 100}%` }}
              ></div>
              <div 
                className="h-full bg-yellow-400 transition-all duration-1000 ease-out"
                style={{ width: `${comparisonData.team_b_win_prob * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Visual Comparison */}
            <div className="space-y-8">
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Relative Power Scales</h3>
                <div className="w-full h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={statsData}>
                      <PolarGrid stroke="#cbd5e1" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                      <PolarRadiusAxis domain={[0, 150]} tick={false} axisLine={false} />
                      <Radar name="My Team" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
                      <Radar name="Their Team" dataKey="B" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                    <span className="text-xs font-bold text-slate-600 uppercase">My Team</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-xs font-bold text-slate-600 uppercase">Their Team</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="text-slate-800 w-5 h-5" />
                  <h3 className="text-lg font-bold text-slate-800">Battle Factors</h3>
                </div>
                <div className="space-y-3">
                  {comparisonData.advantage_factors.map((factor: string, idx: number) => (
                    <div key={idx} className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                      <span className="text-sm font-bold text-slate-700">{factor}</span>
                    </div>
                  ))}
                  {comparisonData.advantage_factors.length === 0 && (
                    <p className="text-slate-400 text-sm italic p-4">No major statistical advantages detected. This battle will be decided by tactics.</p>
                  )}
                </div>
              </div>
              
              <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={24} />
                  <h4 className="text-xl font-black uppercase tracking-tight">Strategist's Verdict</h4>
                </div>
                <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                  {comparisonData.team_a_win_prob > 0.6 
                    ? "Your team has a decisive statistical and type-based advantage. Unless they have highly specific counters, you are favored to win."
                    : comparisonData.team_a_win_prob < 0.4
                      ? "This community team is a hard counter to your current composition. Consider swapping your slower Pokémon for high-speed pivots."
                      : "The teams are extremely well-matched. Focus on maintaining type-advantage rotations to secure the win."
                  }
                </p>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] font-black text-indigo-200 uppercase block mb-1">My Archetype</span>
                    <span className="text-xs font-bold">{myAnalysis.archetype}</span>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] font-black text-indigo-200 uppercase block mb-1">Their Archetype</span>
                    <span className="text-xs font-bold">{theirAnalysis.archetype}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareModal;
