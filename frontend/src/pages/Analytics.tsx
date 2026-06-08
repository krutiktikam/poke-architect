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
      <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
        <p className="font-bold text-slate-800 capitalize mb-1">{data.name}</p>
        <p className="text-sm text-indigo-600 font-bold">Avg Stat: {data.avg_stat}</p>
        <p className="text-xs text-slate-400">Global Rank: #{data.rank}</p>
        <div className="flex gap-1 mt-2">
           <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 font-bold uppercase">{data.type1}</span>
           {data.type2 && <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 font-bold uppercase">{data.type2}</span>}
        </div>
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/global`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching global analytics:', error);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold italic">Crunching the meta-data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl shadow-indigo-100">
            <Activity size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Global Meta-Analytics</h1>
            <p className="text-slate-500 font-medium text-lg">Uncovering patterns across all 1025+ Pokémon</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <Filter size={18} className="text-slate-400 ml-2" />
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-transparent border-none text-slate-600 font-bold focus:ring-0 cursor-pointer capitalize pr-8"
          >
            {ALL_TYPES.map(t => (
              <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Base Stat Ranking - The New Scatter Plot */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="text-indigo-600" />
            <h3 className="text-xl font-bold text-slate-800">Average Base Stat Ranking</h3>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  dataKey="rank" 
                  name="Rank" 
                  reversed 
                  label={{ value: 'Rank (1 = Strongest)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}}
                />
                <YAxis 
                  type="number" 
                  dataKey="avg_stat" 
                  name="Avg Stat" 
                  domain={['auto', 'auto']}
                  label={{ value: 'Avg Base Stat', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}}
                />
                <ZAxis type="number" range={[50, 400]} />
                <Tooltip content={<CustomTooltip />} />
                <Scatter name="Pokemon" data={scatterData} fill="#6366f1">
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.6} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-sm text-slate-400 font-medium bg-slate-50 p-4 rounded-2xl">
            <Sparkles size={14} className="inline mr-2 text-indigo-400" />
            Showing <b>{scatterData.length}</b> Pokémon. Dots are plotted by their average base stats across all 6 dimensions.
          </p>
        </div>

        {/* Generation Trends - Dimensionality & Growth */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="text-rose-500" />
            <h3 className="text-xl font-bold text-slate-800">The Power Creep: Stats by Gen</h3>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.generation_trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="generation" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="attack" stroke="#f43f5e" strokeWidth={3} dot={{r: 6}} activeDot={{r: 8}} />
                <Line type="monotone" dataKey="speed" stroke="#6366f1" strokeWidth={3} dot={{r: 6}} activeDot={{r: 8}} />
                <Line type="monotone" dataKey="hp" stroke="#10b981" strokeWidth={3} dot={{r: 6}} activeDot={{r: 8}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Type Distribution Bar Chart */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <BarChart2 className="text-emerald-500" />
          <h3 className="text-xl font-bold text-slate-800">Global Type Population (Primary + Secondary)</h3>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.type_distribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
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
