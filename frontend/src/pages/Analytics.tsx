import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BarChart2, Activity, Loader2, Sparkles, TrendingUp, Filter } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, CartesianGrid, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { API_BASE_URL } from '../config';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', 
  '#10b981', '#06b6d4', '#3b82f6', '#2dd4bf', '#fb7185',
  '#a855f7', '#fb923c', '#4ade80', '#60a5fa', '#f472b6',
  '#22c55e', '#eab308', '#ef4444'
];

const ALL_TYPES = [
  "all", "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", 
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/10">
        <p className="font-black text-white capitalize mb-1 tracking-tight text-sm">{data.name}</p>
        <p className="text-xs text-indigo-400 font-black uppercase tracking-wider">Avg Stat: {data.avg_stat}</p>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Rank: #{data.rank}</p>
        <div className="flex gap-1 mt-2">
           <span className="text-[8px] px-2 py-0.5 bg-white/5 border border-white/5 rounded-full text-slate-400 font-black uppercase tracking-wider">{data.type1}</span>
           {data.type2 && <span className="text-[8px] px-2 py-0.5 bg-white/5 border border-white/5 rounded-full text-slate-400 font-black uppercase tracking-wider">{data.type2}</span>}
        </div>
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/global`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching global analytics:', error);
      setError('Failed to fetch global metadata. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const scatterData = useMemo(() => {
    if (!data?.pokemon_stats) return [];
    
    // Sort all pokemon by avg_stat to get global rank
    const rankedAll = [...data.pokemon_stats]
      .sort((a, b) => b.avg_stat - a.avg_stat)
      .map((p, index) => ({ ...p, rank: index + 1 }));

    // Filter by type
    return rankedAll.filter(p => 
      selectedType === 'all' || 
      p.type1 === selectedType || 
      p.type2 === selectedType
    );
  }, [data, selectedType]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Crunching the meta-data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 relative">
        <div className="absolute inset-0 bg-red-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="bg-red-500/10 p-5 rounded-[2rem] text-red-400 mb-6 border border-red-500/20 relative z-10">
          <Activity size={32} />
        </div>
        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight relative z-10">Analysis Engine Offline</h3>
        <p className="text-slate-400 mb-8 max-w-md font-medium text-sm leading-relaxed relative z-10">{error}</p>
        <button 
          onClick={fetchAnalytics}
          className="relative z-10 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
        >
          Re-initialize Connection
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">No Meta-Data Found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
        <div className="flex items-center gap-6">
          <div className="bg-slate-950 p-5 rounded-[2rem] text-white shadow-2xl border border-white/5 relative group">
            <Activity size={32} className="text-indigo-400 relative z-10 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Global Meta-Analytics</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] opacity-60">Uncovering patterns across all 1025+ Pokémon</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-2xl border border-white/10 shadow-inner">
          <Filter size={18} className="text-slate-500 ml-2" />
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-transparent border-none text-white font-black text-xs uppercase tracking-widest focus:ring-0 cursor-pointer capitalize pr-8 outline-none"
          >
            {ALL_TYPES.map(t => (
              <option key={t} value={t} className="bg-slate-950 text-white font-black uppercase tracking-wider">{t === 'all' ? 'All Types' : t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 relative z-10">
        {/* Base Stat Ranking - Scatter Plot */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="text-indigo-400 w-6 h-6" />
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Average Base Stat Ranking</h3>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  type="number" 
                  dataKey="rank" 
                  name="Rank" 
                  reversed 
                  label={{ value: 'Rank (1 = Strongest)', position: 'insideBottom', offset: -10, fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }}
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800}}
                />
                <YAxis 
                  type="number" 
                  dataKey="avg_stat" 
                  name="Avg Stat" 
                  domain={['auto', 'auto']}
                  label={{ value: 'Avg Base Stat', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }}
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800}}
                />
                <ZAxis type="number" range={[50, 400]} />
                <Tooltip content={<CustomTooltip />} />
                <Scatter name="Pokemon" data={scatterData}>
                  {scatterData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.6} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-6 text-[10px] text-slate-400 font-black uppercase tracking-wider bg-white/[0.02] border border-white/5 p-4 rounded-2xl leading-relaxed">
            <Sparkles size={14} className="inline mr-2 text-indigo-400" />
            Showing <b>{scatterData.length}</b> Pokémon. Dots are plotted by their average base stats across all 6 dimensions.
          </p>
        </div>

        {/* Generation Trends */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="text-rose-400 w-6 h-6" />
            <h3 className="text-xl font-black text-white uppercase tracking-tight">The Power Creep: Stats by Gen</h3>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.generation_trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="generation" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 17, 26, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  labelStyle={{ color: '#fff', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: '900' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', paddingTop: '15px' }} />
                <Line type="monotone" dataKey="attack" stroke="#f43f5e" strokeWidth={3} dot={{r: 6}} activeDot={{r: 8}} name="Avg Attack" />
                <Line type="monotone" dataKey="speed" stroke="#6366f1" strokeWidth={3} dot={{r: 6}} activeDot={{r: 8}} name="Avg Speed" />
                <Line type="monotone" dataKey="hp" stroke="#10b981" strokeWidth={3} dot={{r: 6}} activeDot={{r: 8}} name="Avg HP" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Type Distribution Bar Chart */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <BarChart2 className="text-emerald-400 w-6 h-6" />
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Global Type Population</h3>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.type_distribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800}} />
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.02)'}}
                contentStyle={{ backgroundColor: 'rgba(15, 17, 26, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                labelStyle={{ color: '#fff', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }}
                itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: '900' }}
              />
              <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                {data.type_distribution.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
