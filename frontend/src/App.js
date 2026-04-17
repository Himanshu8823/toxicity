import React, { useEffect, useState } from 'react';
import LandingPage from './pages/LandingPage';
import ResultsPage from './pages/ResultsPage';
import AboutPage from './pages/AboutPage';

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [currentPage, setCurrentPage] = useState('landing');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (currentPage === 'about') {
    return <AboutPage onBack={() => setCurrentPage('landing')} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return analysisData ? (
    <ResultsPage data={analysisData} onBack={() => setAnalysisData(null)} theme={theme} onToggleTheme={toggleTheme} />
  ) : (
    <LandingPage onAnalysis={setAnalysisData} onNavigate={setCurrentPage} theme={theme} onToggleTheme={toggleTheme} />
  );
}

export default App;
