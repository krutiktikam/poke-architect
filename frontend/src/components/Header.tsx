import React from 'react';
import { Shield, LayoutDashboard, BarChart3, Library } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Builder', path: '/builder', icon: LayoutDashboard },
    { name: 'Analysis', path: '/analysis', icon: BarChart3 },
    { name: 'Pokedex', path: '/pokedex', icon: Library },
  ];

  return (
    <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Shield className="text-yellow-400 w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tight m-0">
            Poké<span className="text-yellow-400">Architect</span>
          </h1>
        </Link>
        <nav className="flex gap-1 bg-slate-800 p-1 rounded-xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/builder' && location.pathname === '/');
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;
