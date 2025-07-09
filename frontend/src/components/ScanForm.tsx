import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/style.css';

const ScanForm: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('https://');
  const [exclude, setExclude] = useState('');
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [fullScan, setFullScan] = useState(false);
  const [maxDepth, setMaxDepth] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const totalSteps = 5;

  useEffect(() => {
    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch("http://localhost:8000/log-buffer");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // ignore errors
    }
  };

  useEffect(() => {
    if (!userScrolledRef.current && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const pollForCompletion = async () => {
    while (true) {
      try {
        const statusRes = await fetch("http://localhost:8000/scan/status");
        const status = await statusRes.json();
        if (!status.running) return true;
        await new Promise(r => setTimeout(r, 1500));
      } catch {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  };

  const handleScan = async () => {
    setLoading(true);
    setIssues([]);
    setScanComplete(false);
    setLogs([]);

    const excludeArray = exclude.split(',').map(e => e.trim()).filter(Boolean);

    try {
      const startRes = await fetch("http://localhost:8000/scan/start", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, exclude: excludeArray, full: fullScan, max_depth: maxDepth })
      });

      if (!startRes.ok) return;

      await pollForCompletion();

      const resultRes = await fetch("http://localhost:8000/scan/result");
      const result = await resultRes.json();
      setIssues(result.issues || []);
      setScanComplete(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCrawlDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDepth = Number(e.target.value);
    setMaxDepth(newDepth);
    setShowWarning(newDepth >= 2);
  };

  const isValidUrl = (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const progress = (step / totalSteps) * 100;

  const countByType = (type: string) => issues.filter((issue) => issue.type === type).length;

  return (
    <div className="scanform-wrapper">
      <h1 className="logo">ASQA BariFree V2.1.1</h1>
      <div className="step-card">
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }}></div>
        </div>

        {step === 1 && (
          <>
            <h2>Schritt 1</h2>
            <p><strong>Bitte geben Sie die URL der Webseite ein, die Sie überprüfen wollen:</strong></p>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="input"
            />
            <div className="step-actions">
              <button onClick={() => navigate('/')} className="button">Zur Startseite</button>
              <button
                disabled={!isValidUrl(url)}
                onClick={() => setStep(2)}
                className="button primary"
              >
                Weiter
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Schritt 2</h2>
            <p><strong>Möchten Sie nur die Startseite/Single-URL scannen oder die gesamte Website?</strong></p>
            <label><input type="radio" checked={!fullScan} onChange={() => setFullScan(false)} /> Nur die Startseite/Single-URL</label>
            <label><input type="radio" checked={fullScan} onChange={() => setFullScan(true)} /> Gesamte Website mit allen Verzeichnissen</label>
            <div className="step-actions">
              <button onClick={() => setStep(1)} className="button">Zurück</button>
              <button onClick={() => setStep(3)} className="button primary">Weiter</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Schritt 3</h2>
            <p><strong>Wie viele Ebenen (Subpages) tief soll der Scan durchgeführt werden?</strong></p>
            <input
              type="number"
              min="1"
              max="5"
              value={maxDepth}
              onChange={handleCrawlDepthChange}
              className="input"
            />
            {showWarning && (
  <p className="warning">
    <strong>Achtung!</strong><br></br> Das Erhöhen der Tiefe (2+) kann bei größeren Websites<br></br> zu erheblichen Datenmengen und gefundenen Fehlern führen.<br></br>Außerdem kann es die Dauer des Tests extrem verlängern.
  </p>
)}
            <div className="step-actions">
              <button onClick={() => setStep(2)} className="button">Zurück</button>
              <button onClick={() => setStep(4)} className="button primary">Weiter</button>
            </div>
          </>
        )}

{step === 4 && (
  <>
    <h2>Schritt 4</h2>
    <p><strong>Sollen bestimmte Bereiche vom Scan ausgeschlossen werden?</strong></p>
    <input
      type="text"
      value={exclude}
      onChange={(e) => setExclude(e.target.value)}
      placeholder="z.b. /projekte, /admin"
      className="input"
    />

    <div style={{ textAlign: 'center', marginTop: '8px' }}>
      <span
        className="info-link"
        onClick={() => setShowHelp(true)}
        style={{ cursor: 'pointer', textDecoration: 'underline', color: '#007bff' }}
      >
        Info/Hilfe
      </span>
    </div>

    {showHelp && (
      <div className="modal-overlay">
        <div className="modal-box">
          <span className="tooltip-close" onClick={() => setShowHelp(false)}>×</span>
          <h3>Info</h3>
          <p>Trennen Sie mehrere Muster mit Komma, Wildcards sind erlaubt.</p>
          <button onClick={() => setShowHelp(false)}>Schließen</button>
        </div>
      </div>
    )}

    <div className="step-actions">
      <button onClick={() => setStep(3)} className="button">Zurück</button>
      <button onClick={() => setStep(5)} className="button primary">Weiter</button>
    </div>
  </>
)}


        {step === 5 && (
          <>
            <h2>Schritt 5</h2>
            <p>Prüfung starten und Ergebnisse anzeigen:</p>

            <div className="results-grid">
              <div
                className="pseudo-terminal"
                ref={logRef}
                onScroll={() => {
                  if (!logRef.current) return;
                  const nearBottom =
                    logRef.current.scrollHeight -
                    logRef.current.scrollTop -
                    logRef.current.clientHeight < 10;
                  userScrolledRef.current = !nearBottom;
                }}
              >
                <pre>{logs.join('\n') || "Keine Ausgaben vorhanden. Bitte Test starten."}</pre>
              </div>

              <div className="summary-box">
                <p><strong>Gefundene Fehler insgesamt:</strong> {scanComplete ? issues.length : "–"}</p>
                <p>Kontrast-Fehler: {scanComplete ? countByType("contrast_insufficient") : "–"}</p>
                <p>Bilder ohne Alt-Text: {scanComplete ? countByType("image_alt_missing") : "–"}</p>
                <p>Links ohne Alt-Text: {scanComplete ? countByType("link_incomplete") : "–"}</p>
                <p>Semantisch falsche Schaltflächen: {scanComplete ? countByType("nonsemantic_button") : "–"}</p>
                <p>Fehlende Formular-Labels: {scanComplete ? countByType("form_label_missing") : "–"}</p>
                <p>Überschriftenfehler: {scanComplete ? countByType("heading_hierarchy_error") : "–"}</p>
                <p>ARIA-Probleme: {scanComplete ? countByType("aria_label_without_text") : "–"}</p>
              </div>
            </div>

            <div className="report-buttons">
              <a
                href={scanComplete ? "http://localhost:8000/download-csv" : undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="start-button" disabled={!scanComplete}>CSV herunterladen</button>
              </a>
              <a
                href={scanComplete ? "http://localhost:8000/download-html" : undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="start-button" disabled={!scanComplete}>HTML herunterladen</button>
              </a>
            </div>

            <div className="step-actions">
              <button onClick={() => setStep(4)} className="button">Zurück</button>
              <button onClick={handleScan} disabled={loading} className="button primary">
                {loading ? "Scan läuft..." : "Prüfung starten"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScanForm;
