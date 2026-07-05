import React from 'react';
import { Shield, LayoutDashboard, BarChart3, Library, Users, LogIn, LogOut, User, Trophy, Activity, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Header: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, user, login, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  const navItems = [
    { name: 'Builder', path: '/builder', icon: LayoutDashboard },
    { name: 'Analysis', path: '/analysis', icon: BarChart3 },
    { name: 'Pokedex', path: '/pokedex', icon: Library },
    { name: 'Community', path: '/community', icon: Users },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Analytics', path: '/analytics', icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0f111a]/60 backdrop-blur-xl border-b border-white/[0.05]">
      <div className="container mx-auto px-4 h-20 flex justify-between items-center">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <Shield className="text-indigo-500 w-8 h-8 relative z-10 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full animate-pulse-glow" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter m-0 leading-none text-white">
              POKÉ<span className="text-indigo-500">ARCHITECT</span>
            </h1>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Neural Interface v5.0</span>
          </div>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-2 bg-white/[0.02] p-1.5 rounded-2xl border border-white/[0.05]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/builder' && location.pathname === '/');
            return (
              <Link
                key={item.name}
                to={item.path}
                className="relative group"
              >
                <div
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                    isActive 
                      ? 'text-white' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-indigo-400' : ''} />
                  <span>{item.name}</span>
                </div>
                {isActive && (
                  <motion.div 
                    layoutId="nav-active"
                    className="absolute inset-0 bg-white/[0.05] rounded-xl -z-10 nav-active-glow border border-white/5"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link 
                to="/profile"
                className={`flex items-center gap-3 bg-white/[0.02] px-4 py-2 rounded-2xl border transition-all group ${
                  location.pathname === '/profile' 
                    ? 'border-indigo-500/50 bg-indigo-500/5' 
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-lg border border-white/10 group-hover:scale-110 transition-transform" />
                ) : (
                  <User size={14} className="text-slate-500" />
                )}
                <span className="text-[10px] font-black text-white hidden lg:block tracking-widest">{user?.name?.toUpperCase()}</span>
              </Link>
              <button 
                onClick={logout}
                className="p-2.5 text-slate-600 hover:text-red-400 transition-all"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={login}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <LogIn size={14} />
              <span>Connect</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="xl:hidden p-2 text-slate-500 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="xl:hidden bg-slate-900 border-t border-white/5 overflow-hidden"
          >
            <div className="grid grid-cols-2 p-4 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
