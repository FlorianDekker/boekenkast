import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getApiKey, setApiKey, testApiKey } from '../api/claude';
import {
  db,
  addBook,
  newId,
  exportBooksJson,
  importBooksJson,
  clearAllBooks,
} from '../db';
import type { Book } from '../types';

// Voorbeeldboeken om zonder scanner te testen.
const SAMPLES: Omit<Book, 'id' | 'addedAt'>[] = [
  {
    title: 'Sapiens',
    authors: ['Yuval Noah Harari'],
    summary: 'Een beknopte geschiedenis van de mensheid.',
    summarySource: 'manual',
    categories: ['Geschiedenis', 'Non-fictie'],
    status: 'to-read',
  },
  {
    title: 'Dune',
    authors: ['Frank Herbert'],
    summary: 'Sciencefiction-epos op de woestijnplaneet Arrakis.',
    summarySource: 'manual',
    categories: ['Sciencefiction', 'Fictie'],
    status: 'to-read',
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const bookCount = useLiveQuery(() => db.books.count()) ?? 0;
  const [key, setKey] = useState(getApiKey() ?? '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [backupMsg, setBackupMsg] = useState('Nog geen export gemaakt');
  const importInputRef = useRef<HTMLInputElement>(null);

  function onKeyChange(value: string) {
    setKey(value);
    setApiKey(value); // meteen lokaal bewaren
    setTestResult(null);
  }

  async function runTest() {
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
    const date = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    a.href = url;
    a.download = `boekenkast-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMsg(`Geëxporteerd op ${date}`);
  }

  async function onImportPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const count = await importBooksJson(await file.text());
      setBackupMsg(`${count} boeken geïmporteerd ✓`);
    } catch (err) {
      setBackupMsg(err instanceof Error ? err.message : 'Import mislukt');
    }
  }

  async function addExample() {
    const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    await addBook({ ...sample, id: newId(), addedAt: Date.now() });
  }

  async function resetAll() {
    if (confirm(`Alle ${bookCount} boeken van dit apparaat verwijderen?`)) {
      await clearAllBooks();
    }
  }

  return (
    <div className="app app--plain">
      <header className="app-header app-header--sub">
        <button className="app-header__back" aria-label="Terug" onClick={() => navigate('/')}>
          ←
        </button>
        <span className="app-header__title">Instellingen</span>
      </header>

      <main className="app__main">
        <div className="settings">
          <section className="setting-group">
            <h2 className="setting-group__title">Claude API-sleutel</h2>
            <p className="helper">
              Nodig voor Nederlandse AI-samenvattingen en de foto-fallback. De sleutel blijft
              alleen op dit apparaat.
            </p>
            <p className="helper">
              ⚠️ Dit is een browser-app zonder server. Prima voor persoonlijk gebruik; zet je de
              app ooit publiek online, gebruik dan een proxy zodat de sleutel niet zichtbaar is.
            </p>
            <div className="field">
              <label className="field__label">Sleutel</label>
              <div className="setting-group__row">
                <input
                  className="input input--mono"
                  type="password"
                  placeholder="sk-ant-…"
                  autoComplete="off"
                  value={key}
                  onChange={(e) => onKeyChange(e.target.value)}
                />
                <button className="btn btn--secondary" onClick={runTest} disabled={testing || !key}>
                  {testing ? 'Testen…' : 'Test'}
                </button>
              </div>
            </div>
            {testResult && (
              <span className={`status ${testResult.ok ? 'status--ok' : 'status--error'}`}>
                <span className="status__dot" />
                {testResult.message}
              </span>
            )}
          </section>

          <section className="setting-group">
            <h2 className="setting-group__title">Back-up</h2>
            <p className="helper">
              Exporteer je kast als JSON-bestand, of zet een eerdere export terug.
            </p>
            <div className="setting-group__actions">
              <button className="btn" onClick={exportBackup}>
                Exporteren
              </button>
              <button className="btn" onClick={() => importInputRef.current?.click()}>
                Importeren
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={onImportPicked}
              />
            </div>
            <span className="status">
              <span className="status__dot" />
              {backupMsg}
            </span>
          </section>

          <section className="setting-group">
            <h2 className="setting-group__title">Voorbeelddata</h2>
            <p className="helper">
              Voegt één boek toe om zonder scanner te testen.
            </p>
            <button className="btn btn--sm" onClick={addExample}>
              Voorbeeldboek toevoegen
            </button>
          </section>

          <section className="setting-group">
            <h2 className="setting-group__title">Kast wissen</h2>
            <p className="helper">Verwijdert alle {bookCount} boeken van dit apparaat.</p>
            <button className="btn btn--danger btn--sm" onClick={resetAll}>
              Alles verwijderen
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
