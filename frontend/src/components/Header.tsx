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
    <header className="bg-slate-950 text-white border-b border-white/5 sticky top-0 z-50 backdrop-blur-md bg-slate-950/90">
      {/* Top Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-yellow-400 to-indigo-600" />
      
      <div className="container mx-auto px-4 h-20 flex justify-between items-center relative">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <Shield className="text-yellow-400 w-9 h-9 relative z-10" />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full" 
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter m-0 leading-none">
              POKÉ<span className="text-yellow-400">ARCHITECT</span>
            </h1>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">System v4.2.0</span>
          </div>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5 shadow-inner">
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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    isActive 
                      ? 'text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </div>
                {isActive && (
                  <motion.div 
                    layoutId="nav-active"
                    className="absolute inset-0 bg-indigo-600 rounded-xl -z-10 shadow-lg shadow-indigo-500/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-4">
          <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block"></div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link 
                to="/profile"
                className={`flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border transition-all group ${
                  location.pathname === '/profile' 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : 'border-white/5 hover:border-white/20'
                }`}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-lg border border-white/20 group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="p-1.5 bg-slate-800 rounded-lg">
                    <User size={16} className="text-slate-400" />
                  </div>
                )}
                <div className="flex flex-col items-start leading-none hidden lg:flex">
                  <span className="text-xs font-black text-white">{user?.name}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Pro Member</span>
                </div>
              </Link>
              <button 
                onClick={logout}
                className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all border border-transparent hover:border-red-400/20"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={login}
              className="group relative flex items-center gap-2 bg-yellow-400 text-slate-950 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-yellow-300 transition-all shadow-lg active:scale-95 overflow-hidden"
            >
              <motion.div 
                className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500 skew-x-12"
              />
              <LogIn size={18} />
              <span>Login</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="xl:hidden p-2 text-slate-400 hover:text-white"
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
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
