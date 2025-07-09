import React from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import ScanForm from './components/ScanForm';
import './css/style.css';

const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleStartTest = () => {
    navigate('/test');
  };

  return (
    <div className="welcome-container">
      <h1 className="logo">ASQA BariFree V2.1.1</h1>
      <p className="welcome-text">
        Gesellschaftliche Teilhabe betrifft auch den digitalen Raum. Doch für viele Menschen mit Seh- oder Hörbeeinträchtigungen sind Webanwendungen noch immer voller Barrieren.
      </p>
      <p className="welcome-text">
        Das Tool prüft zentrale Kriterien wie Alternativtexte, Farbkontraste und die Struktur von Überschriften. Anschließend erhalten Sie eine übersichtliche Auswertung und optional einen detaillierten Bericht als HTML oder CSV.
      </p>
      <button className="start-button" onClick={handleStartTest}>
        Test starten
      </button>
    </div>
  );
};


const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/test" element={<ScanForm />} />
      </Routes>
    </Router>
  );
};

export default App;
