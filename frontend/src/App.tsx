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
import AuthCallback from './pages/AuthCallback';
import { useTeam } from './context/TeamContext';

axios.defaults.withCredentials = true;

// Wrapper component to handle TeamDock visibility and context
const AppContent = () => {
  const { team, removeFromTeam } = useTeam();

  return (
    <div className="min-h-screen bg-slate-50 pb-32 text-slate-900">
      <Header />
      
      <main>
        <Routes>
          <Route path="/" element={<Builder />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/pokedex" element={<Pokedex />} />
          <Route path="/community" element={<Community />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
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
