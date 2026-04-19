import React from 'react';

const TeamSkeleton = () => {
  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm animate-pulse">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-100 rounded-lg"></div>
            <div className="h-3 w-24 bg-slate-50 rounded-lg"></div>
          </div>
          <div className="h-6 w-20 bg-slate-50 rounded-full"></div>
        </div>

        <div className="flex gap-2 justify-center py-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-12 h-12 bg-slate-200/50 rounded-full"></div>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="flex-grow h-12 bg-slate-100 rounded-xl"></div>
          <div className="w-12 h-12 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
};

export default TeamSkeleton;
