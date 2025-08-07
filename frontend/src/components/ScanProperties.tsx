import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/style.css';

const ScanProperties: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [exclude, setExclude] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanAborted, setScanAborted] = useState(false);
  const [abortReason, setAbortReason] = useState<string | null>(null);
  const [fullScan, setFullScan] = useState(false);
  const [maxDepth, setMaxDepth] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  const totalSteps = 6;

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, [loading]);

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

        if (!status.running) {
          if (status.abort_reason) {
            setScanAborted(true);
            setAbortReason(status.abort_reason);
          }
          return true;
        }

        await new Promise((r) => setTimeout(r, 1500));
      } catch {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  };

  const handleScan = async () => {
    setLoading(true);
    setIssues([]);
    setLogs([]);
    setScanComplete(false);
    setScanAborted(false);
    setAbortReason(null);

    const excludeArray = exclude.trim()
      ? exclude.split(',').map(e => e.trim()).filter(Boolean)
      : [];

    const emailToSend = email.trim() === "" ? undefined : email.trim();
    const nameToSend = name.trim() === "" ? undefined : name.trim();

    try {
      const startRes = await fetch("http://localhost:8000/scan/start", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          exclude: excludeArray,
          full: fullScan,
          max_depth: maxDepth,
          email: emailToSend,
          name: nameToSend
        })
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

  const handleAbort = async () => {
    try {
      await fetch("http://localhost:8000/scan/abort", { method: "POST" });
    } catch {
      // Fehler ignorieren
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

  const countByType = (type: string) => issues.filter(issue => issue.type === type).length;

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
              placeholder="Hier bitte URL eingeben (z.B. https://www.beispiel.de)"
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
            <p className="warning">
              <strong>Achtung!</strong><br></br> Das erhöhen der Tiefe auf 2 oder höher kann die Dauer des Testdurchlaufs extrem verlängern<br></br>
              Bei sehr großen Webseiten auf mehrere Stunden und kann unter Umständen tausende von Einträgen erzeugen.
            </p>
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
              placeholder="z.B. /projekte, /admin"
              className="input"
            />
            <div style={{ marginTop: '4px', fontSize: '0.85em' }}>
              <span
                style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer' }}
                onClick={() => setShowHelp(true)}
              >
                Hinweise zu Wildcards
              </span>
            </div>

            {showHelp && (
              <div className="modal-overlay">
                <div className="modal-box">
                  <span className="tooltip-close" onClick={() => setShowHelp(false)}>×</span>
                  <h3>Wildcard-Hilfe</h3>

                  <p style={{ whiteSpace: 'pre-line', textAlign: 'left' }}>
                    /ordnername* <br></br>
                    Ignoriert alle Pfade, die mit /ordnername beginnen, inklusive aller Unterverzeichnisse.<br></br>
                    Beispiel: ignoriert /ordnername, /ordnername/abc, /ordnername123<br></br>
                    <br></br>
                    /ordnername/*<br></br>
                    Ignoriert nur Inhalte unterhalb von /ordnername/, aber nicht /ordnername selbst.<br></br>
                    Beispiel: ignoriert /ordnername/abc, aber nicht /ordnername<br></br>
                    <br></br>
                    *.php<br></br>
                    Ignoriert alle Dateien mit der Endung .php.<br></br>
                    Beispiel: ignoriert /index.php, /ordner/test.php<br></br>
                    <br></br>
                    ?age<br></br>
                    Ignoriert alle Pfade, bei denen genau ein beliebiges Zeichen vor age steht.<br></br>
                    Beispiel: ignoriert /page, /sage<br></br>
                    <br></br>
                    [abc]<br></br>
                    Ignoriert genau einen der angegebenen Buchstaben.<br></br>
                    Beispiel: ignoriert /a, /b, /c<br></br>
                  </p>
                  <br></br>
                  <p style={{ marginTop: '1em' }}>
                    Mehrere Muster können durch Kommas getrennt angegeben werden.
                  </p>

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
            <p><strong>Optional: Möchten Sie eine E‑Mail‑Benachrichtigung nach Abschluss erhalten?</strong></p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="input"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E‑Mail‑Adresse (optional)"
              className="input"
            />

            <div style={{ marginTop: '4px', fontSize: '0.85em' }}>
              Mit Klicken auf „Weiter“ akzeptieren Sie die{' '}
              <span
                style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer' }}
                onClick={() => setShowPrivacy(true)}
              >
                Hinweise zum Datenschutz
              </span>
            </div>

            {showPrivacy && (
              <div className="modal-overlay">
                <div className="modal-box">
                  <span className="tooltip-close" onClick={() => setShowPrivacy(false)}>×</span>
                  <h3>Datenschutzhinweis</h3>
                  <p>
                    Die hier eingegebenen Daten (Name und E‑Mail‑Adresse) werden ausschließlich zum Zweck der
                    Benachrichtigung nach Abschluss des Scans verwendet. Die Daten werden nicht dauerhaft
                    gespeichert oder an Dritte weitergegeben. Die E‑Mail‑Adresse befindet sich nach dem Versand
                    in der „Gesendet“‑Übersicht des Mailservers und wird dort nach spätestens 90 Tagen automatisch
                    gelöscht. Es erfolgt keine weitere Verarbeitung oder Nutzung der Daten.
                  </p>
                  <button onClick={() => setShowPrivacy(false)}>Schließen</button>
                </div>
              </div>
            )}

            <div className="step-actions">
              <button onClick={() => setStep(4)} className="button">Zurück</button>
              <button onClick={() => setStep(6)} className="button primary">Weiter</button>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <h2>Schritt 6</h2>
            <p>Prüfung starten und Ergebnisse anzeigen:</p>

            <div className="results-grid">
              <div className="pseudo-terminal" ref={logRef}>
                <pre>{logs.join('\n') || "Keine Ausgaben vorhanden. Bitte Test starten."}</pre>
              </div>

              <div className="summary-box">
                <p><strong>Gefundene Fehler insgesamt:</strong> {scanComplete && !scanAborted ? issues.length : "–"}</p>
                <p>Kontrast-Fehler: {scanComplete && !scanAborted ? countByType("contrast_insufficient") : "–"}</p>
                <p>Bilder ohne Alt-Text: {scanComplete && !scanAborted ? countByType("image_alt_missing") : "–"}</p>
                <p>Links ohne Alt-Text: {scanComplete && !scanAborted ? countByType("link_incomplete") : "–"}</p>
                <p>Semantisch falsche Schaltflächen: {scanComplete && !scanAborted ? countByType("nonsemantic_button") : "–"}</p>
                <p>Fehlende Formular-Labels: {scanComplete && !scanAborted ? countByType("form_label_missing") : "–"}</p>
                <p>Überschriftenfehler: {scanComplete && !scanAborted ? countByType("heading_hierarchy_error") : "–"}</p>
                <p>ARIA-Probleme: {scanComplete && !scanAborted ? countByType("aria_label_without_text") : "–"}</p>
                {scanAborted && (
                  <p style={{ color: 'red', marginTop: '1em' }}>
                    {abortReason === 'user'
                      ? 'Der Scan wurde vom Benutzer abgebrochen.'
                      : abortReason === 'timeout'
                      ? 'Der Scan wurde aufgrund eines Timeouts abgebrochen.'
                      : 'Der Scan wurde abgebrochen.'}
                    <br />
                    Kein Bericht verfügbar.
                  </p>
                )}
              </div>
            </div>

            {scanComplete && !scanAborted && (
              <div className="report-buttons centered" style={{ marginTop: '1rem' }}>
                <a href="http://localhost:8000/download-csv" target="_blank" rel="noopener noreferrer">
                  <button className="start-button">Download Bericht als CSV</button>
                </a>
                <a href="http://localhost:8000/download-html" target="_blank" rel="noopener noreferrer">
                  <button className="start-button">Download Bericht als HTML</button>
                </a>
              </div>
            )}

            <div className="step-actions">
              <button onClick={() => setStep(5)} className="button">Zurück</button>
              <button onClick={handleScan} disabled={loading} className="button primary">
                {loading ? "Scan läuft..." : "Prüfung starten"}
              </button>
              <button onClick={handleAbort} disabled={!loading} className="button danger">
                Scan abbrechen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScanProperties;