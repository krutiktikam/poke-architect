import React from 'react';
import type { Pokemon } from '../types';
import { X, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TeamDockProps {
  team: Pokemon[];
  onRemove: (id: number) => void;
  onAnalyze?: () => void;
}

const TeamDock: React.FC<TeamDockProps> = ({ team, onRemove }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-40 transition-transform duration-300">
      <div className="container mx-auto flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-grow flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto text-slate-900">
          {Array.from({ length: 6 }).map((_, index) => {
            const member = team[index];
            return (
              <div 
                key={index} 
                className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg border-2 border-dashed flex items-center justify-center relative ${
                  member ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                {member ? (
                  <>
                    <img 
                      src={member.sprite_url} 
                      alt={member.name} 
                      className="w-14 h-14 md:w-16 md:h-16 object-contain"
                    />
                    <button 
                      onClick={() => onRemove(member.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <span className="text-slate-300 font-bold text-xl">{index + 1}</span>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex flex-col w-full md:w-64 gap-2">
          <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            <span>Team Members</span>
            <span>{team.length}/6</span>
          </div>
          <Link 
            to={team.length > 0 ? "/analysis" : "#"}
            className={`flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold transition-all shadow-sm ${
              team.length > 0 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'
            }`}
          >
            <Trophy size={18} />
            Analyze Team
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TeamDock;
