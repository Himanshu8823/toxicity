import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import ResultsPage from './pages/ResultsPage';
import AboutPage from './pages/AboutPage';

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [currentPage, setCurrentPage] = useState('landing');

  if (currentPage === 'about') {
    return <AboutPage onBack={() => setCurrentPage('landing')} />;
  }

  return analysisData ? (
    <ResultsPage data={analysisData} onBack={() => setAnalysisData(null)} />
  ) : (
    <LandingPage onAnalysis={setAnalysisData} onNavigate={setCurrentPage} />
  );
}

export default App;
