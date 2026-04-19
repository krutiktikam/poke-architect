import React from 'react';
import { Shield, Activity, Award, CheckCircle2 } from 'lucide-react';
import type { Pokemon } from '../types';

interface CertificateCardProps {
  team: Pokemon[];
  analysis: any;
  userName?: string;
}

const CertificateCard = React.forwardRef<HTMLDivElement, CertificateCardProps>(({ team, analysis, userName }, ref) => {
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div 
      ref={ref}
      className="w-[1000px] bg-slate-950 text-white p-16 relative overflow-hidden font-sans border-[12px] border-slate-900"
      style={{ minHeight: '650px' }}
    >
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full -mr-64 -mt-64 blur-[120px]"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-yellow-500/5 rounded-full -ml-48 -mb-48 blur-[100px]"></div>
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', size: '20px 20px' }}></div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Header */}
        <div className="flex justify-between items-start mb-16">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-yellow-400 to-amber-500 p-4 rounded-[2rem] shadow-2xl shadow-yellow-500/20">
              <Shield size={48} className="text-slate-950" />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter leading-none mb-2">
                Poké<span className="text-yellow-400">Architect</span>
              </h1>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Verified Strategic Composition</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-white/5 border border-white/10 rounded-3xl px-8 py-4 backdrop-blur-md">
            <div className="text-right">
              <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1">Team Tier</p>
              <p className="text-sm font-bold text-white uppercase">{analysis?.archetype || 'Mixed'}</p>
            </div>
            <div className="w-px h-10 bg-white/10"></div>
            <div className="text-center">
              <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1">Grade</p>
              <p className="text-5xl font-black text-yellow-400 leading-none">{analysis?.health_score || 'A'}</p>
            </div>
          </div>
        </div>

        {/* Pokemon Grid */}
        <div className="grid grid-cols-6 gap-4 mb-16">
          {team.map((p) => (
            <div key={p.id} className="bg-gradient-to-b from-white/[0.07] to-transparent border border-white/10 rounded-[2.5rem] p-5 flex flex-col items-center backdrop-blur-sm group relative h-[240px]">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full scale-50 group-hover:scale-110 transition-transform duration-500"></div>
                <img 
                  src={p.sprite_url} 
                  alt={p.name} 
                  className="w-28 h-28 object-contain relative z-10 drop-shadow-[0_15px_15px_rgba(0,0,0,0.4)]" 
                />
              </div>
              <div className="text-center mt-auto">
                <span className="text-sm font-black capitalize block mb-3 leading-tight px-1 h-10 flex items-center justify-center">
                  {p.name}
                </span>
                <div className="flex gap-1.5 justify-center">
                  <span className="text-[7px] px-2.5 py-1 rounded-full bg-white/10 uppercase font-black tracking-wider border border-white/5">{p.type1}</span>
                  {p.type2 && (
                    <span className="text-[7px] px-2.5 py-1 rounded-full bg-white/10 uppercase font-black tracking-wider border border-white/5">{p.type2}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* Fill empty slots */}
          {[...Array(6 - team.length)].map((_, i) => (
            <div key={`empty-${i}`} className="bg-white/[0.02] border border-white/5 border-dashed rounded-[2.5rem] p-4 flex flex-col items-center justify-center opacity-30 h-[240px]">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/10"></div>
            </div>
          ))}
        </div>

        {/* Footer Metrics & Sign-off */}
        <div className="grid grid-cols-12 gap-12 items-end">
          <div className="col-span-4">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Award size={64} />
              </div>
              <div className="flex items-center gap-3 mb-6 text-indigo-400">
                <Activity size={20} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Efficiency Metrics</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Attack Rating</span>
                  <span className="text-lg font-black text-white">{(analysis?.total_stats?.attack / team.length || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Defense Rating</span>
                  <span className="text-lg font-black text-white">{(analysis?.total_stats?.defense / team.length || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Speed Rating</span>
                  <span className="text-lg font-black text-white">{(analysis?.total_stats?.speed / team.length || 0).toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-8 flex flex-col justify-end pb-4">
            <div className="flex justify-between items-end border-t border-white/10 pt-10">
              <div className="relative">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-4">Certified Architect</p>
                <p className="text-4xl font-bold italic font-serif tracking-tight text-white/90 underline decoration-yellow-400/30 underline-offset-8">
                  {userName || 'Elite Trainer'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2">Issue Date</p>
                <p className="text-lg font-bold text-slate-300">{date}</p>
                <div className="mt-4 flex justify-end">
                   <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
                      <Award size={24} className="text-yellow-400/50" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Holographic Bottom Bar */}
        <div className="absolute bottom-0 left-0 w-full h-3 bg-gradient-to-r from-yellow-400 via-indigo-500 to-yellow-400 shadow-[0_-5px_20px_rgba(99,102,241,0.2)]"></div>
      </div>
    </div>
  );
});

CertificateCard.displayName = 'CertificateCard';

export default CertificateCard;
