import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { MotionConfig } from 'framer-motion';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, idbPersister, dehydrateOptions, PERSISTER_MAX_AGE } from './api/queryClient';
import { fetchDataVersion } from './api/dataVersion';
import { TeamProvider } from './context/TeamContext';
import { useTeam } from './context/useTeam';
import { AuthProvider } from './context/AuthContext';
import { VersionProvider } from './context/VersionContext';
import { VisualQualityProvider } from './context/VisualQualityContext';
import Header from './components/Header';
import TeamDock from './components/TeamDock';
import ServerStatusNotice from './components/common/ServerStatusNotice';
import HeroBackground from './components/common/HeroBackground';
import Builder from './pages/Builder';
import Analysis from './pages/Analysis';
import Pokedex from './pages/Pokedex';
import Community from './pages/Community';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Analytics from './pages/Analytics';
import AuthCallback from './pages/AuthCallback';
import Compendium from './pages/Compendium';

axios.defaults.withCredentials = true;

// Wrapper component to handle TeamDock visibility, data version watcher, and context
const AppContent: React.FC = () => {
  const { team, removeFromTeam } = useTeam();

  useEffect(() => {
    // Check data version on mount
    fetchDataVersion();

    // Check data version when window regains focus
    const handleFocus = () => {
      fetchDataVersion();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <div className="min-h-screen pb-32">
      {/* Dynamic / Low-Power Adaptive Background */}
      <HeroBackground />

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
          <Route path="/compendium" element={<Compendium />} />
        </Routes>
      </main>

      <TeamDock
        team={team}
        onRemove={removeFromTeam}
        onAnalyze={() => {}}
      />

      {/* Non-blocking server waking and offline notice */}
      <ServerStatusNotice />

      {/* Vercel Web Analytics - disabled under test / Playwright automation */}
      {import.meta.env.MODE !== 'test' &&
        !(typeof navigator !== 'undefined' && navigator.webdriver) && <VercelAnalytics />}
    </div>
  );
};

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <VisualQualityProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: idbPersister,
            maxAge: PERSISTER_MAX_AGE,
            dehydrateOptions,
          }}
        >
          <VersionProvider>
            <AuthProvider>
              <TeamProvider>
                <Router>
                  <AppContent />
                </Router>
              </TeamProvider>
            </AuthProvider>
          </VersionProvider>
        </PersistQueryClientProvider>
      </VisualQualityProvider>
    </MotionConfig>
  );
}

export default App;