import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Edit3, Loader2, Calendar, Globe, Lock, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { API_BASE_URL } from '../config';
import type { Pokemon } from '../types';

interface SavedTeam {
  id: number;
  name: string;
  pokemon_ids: number[];
  is_public: boolean;
  created_at: string;
}

const Profile = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { loadTeam } = useTeam();
  const navigate = useNavigate();
  
  const [teams, setTeams] = useState<SavedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyTeams();
    }
  }, [isAuthenticated]);

  const fetchMyTeams = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/teams`, {
        withCredentials: true
      });
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    
    setDeletingId(id);
    try {
      await axios.delete(`${API_BASE_URL}/teams/${id}`, {
        withCredentials: true
      });
      setTeams(teams.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditTeam = async (team: SavedTeam) => {
    try {
      // Fetch the full pokemon data for these IDs
      const response = await axios.get(`${API_BASE_URL}/pokemon/batch`, {
        params: { ids: team.pokemon_ids.join(',') }
      });
      loadTeam(response.data);
      navigate('/builder');
    } catch (error) {
      console.error('Error loading team for edit:', error);
      alert('Failed to load team data.');
    }
  };

  if (authLoading || (isAuthenticated && loading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-medium">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden mb-8 border border-slate-100">
        <div className="bg-slate-900 px-8 py-12 text-white relative">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name} 
                className="w-32 h-32 rounded-full border-4 border-white/20 shadow-2xl"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center border-4 border-white/20 shadow-2xl">
                <ShieldAlert size={48} className="text-slate-600" />
              </div>
            )}
            <div className="text-center md:text-left">
              <h2 className="text-4xl font-black mb-2">{user?.name}</h2>
              <p className="text-slate-400 font-medium mb-4">{user?.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
                  <span className="block text-xs uppercase tracking-wider text-slate-500 font-bold">Saved Teams</span>
                  <span className="text-2xl font-black">{teams.length}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-500/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              My Teams
              <span className="bg-slate-100 text-slate-500 text-sm px-3 py-1 rounded-full">{teams.length}</span>
            </h3>
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 mb-6 text-lg">You haven't saved any teams yet.</p>
              <button 
                onClick={() => navigate('/builder')}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
              >
                Build Your First Team
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teams.map((team) => (
                <div 
                  key={team.id} 
                  className="group bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-xl hover:border-indigo-100 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-xl font-black text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                        {team.name}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(team.created_at).toLocaleDateString()}
                        </span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="flex items-center gap-1">
                          {team.is_public ? (
                            <><Globe size={14} className="text-emerald-500" /> Public</>
                          ) : (
                            <><Lock size={14} className="text-amber-500" /> Private</>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditTeam(team)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Edit Team"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTeam(team.id)}
                        disabled={deletingId === team.id}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Team"
                      >
                        {deletingId === team.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex -space-x-3 overflow-hidden">
                    {team.pokemon_ids.map((pId, idx) => (
                      <div 
                        key={`${team.id}-${pId}-${idx}`}
                        className="w-12 h-12 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center relative z-0 group-hover:z-10 transition-all"
                      >
                        <img 
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pId}.png`} 
                          alt="pokemon" 
                          className="w-10 h-10 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
                          }}
                        />
                      </div>
                    ))}
                    {/* Placeholder for empty slots */}
                    {[...Array(6 - team.pokemon_ids.length)].map((_, i) => (
                      <div 
                        key={`empty-${i}`} 
                        className="w-12 h-12 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center"
                      ></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
