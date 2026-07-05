import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { TeamProvider } from './context/TeamContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import TeamDock from './components/TeamDock';
import Builder from './pages/Builder';
import Analysis from './pages/Analysis';
import Pokedex from './pages/Pokedex';
import Community from './pages/Community';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Analytics from './pages/Analytics';
import AuthCallback from './pages/AuthCallback';
import { useTeam } from './context/TeamContext';

axios.defaults.withCredentials = true;

// Wrapper component to handle TeamDock visibility and context
const AppContent = () => {
  const { team, removeFromTeam } = useTeam();

  return (
    <div className="min-h-screen pb-32">
      {/* Background Aura Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 hidden md:block">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse-glow" />
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse-glow" style={{ animationDelay: '-2s' }} />
        <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-blue-600/5 blur-[100px] rounded-full animate-pulse-glow" style={{ animationDelay: '-1s' }} />
      </div>

      <Header />
      
      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<Builder />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/pokedex" element={<Pokedex />} />
          <Route path="/community" element={<Community />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </main>

      <TeamDock 
        team={team} 
        onRemove={removeFromTeam} 
        onAnalyze={() => {}} 
      />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <TeamProvider>
        <Router>
          <AppContent />
        </Router>
      </TeamProvider>
    </AuthProvider>
  );
}

export default App;
