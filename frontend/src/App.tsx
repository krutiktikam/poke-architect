import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TeamProvider } from './context/TeamContext';
import Header from './components/Header';
import TeamDock from './components/TeamDock';
import Builder from './pages/Builder';
import Analysis from './pages/Analysis';
import Pokedex from './pages/Pokedex';
import { useTeam } from './context/TeamContext';

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
        </Routes>
      </main>

      <TeamDock 
        team={team} 
        onRemove={removeFromTeam} 
        onAnalyze={() => {}} // Analysis is now a page, but TeamDock might still need to trigger it or just link to it
      />
    </div>
  );
};

function App() {
  return (
    <TeamProvider>
      <Router>
        <AppContent />
      </Router>
    </TeamProvider>
  );
}

export default App;
