import React from 'react';
import { Shield, Sparkles, Zap, Activity } from 'lucide-react';
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
      className="w-[800px] bg-slate-900 text-white p-12 relative overflow-hidden font-sans border-8 border-slate-800"
      style={{ minHeight: '500px' }}
    >
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full -mr-48 -mt-48 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-12">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-400 p-3 rounded-2xl shadow-lg shadow-yellow-400/20">
              <Shield size={40} className="text-slate-900" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight leading-none mb-1">
                Poké<span className="text-yellow-400">Architect</span>
              </h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Official Team Certification</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white mb-1">GRADE <span className="text-yellow-400">{analysis?.health_score || 'A'}</span></div>
            <p className="text-slate-500 font-bold text-xs uppercase">{analysis?.archetype || 'Custom'}</p>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4 mb-12">
          {team.map((p) => (
            <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center backdrop-blur-sm relative group">
              <img 
                src={p.sprite_url} 
                alt={p.name} 
                className="w-24 h-24 object-contain mb-3 drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]" 
              />
              <span className="text-sm font-black capitalize text-center w-full truncate mb-2">{p.name}</span>
              <div className="flex gap-1">
                <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/10 uppercase font-black">{p.type1}</span>
                {p.type2 && (
                  <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/10 uppercase font-black">{p.type2}</span>
                )}
              </div>
            </div>
          ))}
          {/* Fill empty slots */}
          {[...Array(6 - team.length)].map((_, i) => (
            <div key={`empty-${i}`} className="bg-white/5 border border-white/5 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center opacity-30">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 text-indigo-400">
              <Activity size={18} />
              <h3 className="text-sm font-black uppercase tracking-wider">Core Metrics</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold">AVG ATTACK</span>
                <span className="text-sm font-black">{(analysis?.total_stats?.attack / team.length).toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold">AVG DEFENSE</span>
                <span className="text-sm font-black">{(analysis?.total_stats?.defense / team.length).toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold">AVG SPEED</span>
                <span className="text-sm font-black">{(analysis?.total_stats?.speed / team.length).toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div className="col-span-2 flex flex-col justify-end">
            <div className="flex justify-between items-end border-t border-white/10 pt-6">
              <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Architect</p>
                <p className="text-xl font-bold italic">{userName || 'Elite Trainer'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Issue Date</p>
                <p className="text-sm font-bold text-slate-300">{date}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-indigo-500 to-yellow-400"></div>
      </div>
    </div>
  );
});

CertificateCard.displayName = 'CertificateCard';

export default CertificateCard;
