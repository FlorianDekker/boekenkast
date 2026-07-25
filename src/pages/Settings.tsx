import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiKey, setApiKey, testApiKey } from '../api/claude';
import { exportBooksJson, importBooksJson } from '../db';

export default function Settings() {
  const navigate = useNavigate();
  const [key, setKey] = useState(getApiKey() ?? '');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [backupMsg, setBackupMsg] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  function save() {
    setApiKey(key);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  }

  async function runTest() {
    setApiKey(key); // test de key die nu in het veld staat
    setTesting(true);
    setTestResult(null);
    setTestResult(await testApiKey());
    setTesting(false);
  }

  async function exportBackup() {
    const json = await exportBooksJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `boekenkast-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBackupMsg('');
    try {
      const text = await file.text();
      const count = await importBooksJson(text);
      setBackupMsg(`${count} boeken geïmporteerd ✓`);
    } catch (err) {
      setBackupMsg(err instanceof Error ? err.message : 'Import mislukt');
    }
  }

  return (
    <div className="settings">
      <button type="button" className="link-btn back" onClick={() => navigate('/')}>
        ← Terug naar kast
      </button>
      <h2>Instellingen</h2>

      <section className="detail-section">
        <h3>Claude API-key</h3>
        <p className="muted">
          Nodig voor nette Nederlandse samenvattingen/categorieën en de
          foto-fallback. Je key wordt alleen lokaal op dit apparaat bewaard en
          gaat alleen naar Anthropic bij een samenvatting.
        </p>
        <p className="muted warn">
          ⚠️ Dit is een browser-app zonder server, dus de key staat lokaal in je
          browser. Prima voor persoonlijk gebruik op dit apparaat. Ga je de app
          ooit publiek online zetten, gebruik dan een kleine proxy — anders is de
          key zichtbaar.
        </p>
        <input
          className="search"
          type="password"
          placeholder="Plak hier je Claude API-key (sk-ant-…)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={save}>
            Opslaan
          </button>
          <button type="button" className="btn ghost" onClick={runTest} disabled={testing || !key}>
            {testing ? 'Testen…' : 'Test key'}
          </button>
          {saved && <span className="muted">Opgeslagen ✓</span>}
        </div>
        {testResult && (
          <p className={testResult.ok ? 'test-ok' : 'scanner-error'}>{testResult.message}</p>
        )}
      </section>

      <section className="detail-section">
        <h3>Back-up</h3>
        <p className="muted">
          Je boeken staan lokaal op dit apparaat. Maak af en toe een back-up, of
          zet 'm over naar een ander apparaat.
        </p>
        <div className="row">
          <button type="button" className="btn" onClick={exportBackup}>
            Exporteer (download)
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => importInputRef.current?.click()}
          >
            Importeer
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onImportPicked}
          />
        </div>
        {backupMsg && <p className="muted">{backupMsg}</p>}
      </section>
    </div>
  );
}
