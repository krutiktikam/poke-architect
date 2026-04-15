import React from 'react';
import { Shield } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="text-yellow-400 w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tight m-0">
            Poké<span className="text-yellow-400">Architect</span>
          </h1>
        </div>
        <nav>
          <p className="text-slate-400 text-sm italic">Build the ultimate team</p>
        </nav>
      </div>
    </header>
  );
};

export default Header;
