import React from 'react';
import { Shield, LayoutDashboard, BarChart3, Library, Users, LogIn, LogOut, User, Trophy } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, user, login, logout } = useAuth();
  
  const navItems = [
    { name: 'Builder', path: '/builder', icon: LayoutDashboard },
    { name: 'Analysis', path: '/analysis', icon: BarChart3 },
    { name: 'Pokedex', path: '/pokedex', icon: Library },
    { name: 'Community', path: '/community', icon: Users },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
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
        
        <div className="flex items-center gap-4">
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
                  <span className="hidden md:inline">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="w-px h-8 bg-slate-700 mx-2 hidden sm:block"></div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link 
                to="/profile"
                className={`flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border transition-all ${
                  location.pathname === '/profile' 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <User size={16} className="text-slate-400" />
                )}
                <span className="text-xs font-bold text-slate-300 hidden lg:block">{user?.name}</span>
              </Link>
              <button 
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={login}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg"
            >
              <LogIn size={18} />
              <span className="hidden sm:inline">Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
