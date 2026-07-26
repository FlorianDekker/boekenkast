import { useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BarcodeScanner from '../scan/BarcodeScanner';
import { lookupBook, type LookupResult } from '../api/lookup';
import { hasApiKey, summarizeFromPhoto } from '../api/claude';
import { addBook, newId } from '../db';
import { coverTint, lastNameOf } from '../lib/cover';

type Status = 'scanning' | 'looking-up' | 'preview' | 'not-found' | 'error';

// Leest een bestand in als base64 (zonder data:-prefix) voor Claude vision.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sourceLabel(source: LookupResult['summarySource']): string {
  if (source === 'google') return 'Google Books';
  if (source === 'wikipedia') return 'Wikipedia';
  if (source === 'ai') return 'AI (Claude)';
  return String(source);
}

export default function ScanPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('scanning');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [manualIsbn, setManualIsbn] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const lookup = useCallback(async (isbn: string) => {
    setStatus('looking-up');
    try {
      const found = await lookupBook(isbn);
      if (found) {
        setResult(found);
        setStatus('preview');
      } else {
        setStatus('not-found');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Onbekende fout');
      setStatus('error');
    }
  }, []);

  function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isbn = manualIsbn.trim();
    if (isbn) lookup(isbn);
  }

  async function save() {
    if (!result) return;
    await addBook({
      ...result,
      id: newId(),
      status: 'to-read',
      categories: result.categories ?? [],
      addedAt: Date.now(),
    });
    navigate('/');
  }

  function scanAgain() {
    setResult(null);
    setManualIsbn('');
    setErrorMsg('');
    setPhotoError('');
    setStatus('scanning');
  }

  async function onPhotoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !result) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const base64 = await fileToBase64(file);
      const summary = await summarizeFromPhoto(base64, file.type, {
        title: result.title,
        authors: result.authors,
      });
      setResult({ ...result, summary, summarySource: 'ai' });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Foto verwerken mislukt');
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="app app--plain">
      <header className="app-header app-header--sub">
        <button className="app-header__back" aria-label="Terug" onClick={() => navigate('/')}>
          ←
        </button>
        <span className="app-header__title">Boek scannen</span>
      </header>

      <main className="app__main">
        <div className="scanner">
          {status === 'scanning' && (
            <>
              <BarcodeScanner onDetected={lookup} />
              <div className="scanner__manual">
                <div className="field">
                  <label className="field__label">Of vul het ISBN in</label>
                  <form className="scanner__manual-row" onSubmit={onManualSubmit}>
                    <input
                      className="input input--mono"
                      inputMode="numeric"
                      placeholder="978…"
                      value={manualIsbn}
                      onChange={(e) => setManualIsbn(e.target.value)}
                    />
                    <button type="submit" className="btn btn--secondary">
                      Zoek
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}

          {status === 'looking-up' && <p className="helper">Boek opzoeken…</p>}

          {status === 'not-found' && (
            <div className="scanner__manual">
              <p className="status status--error">
                <span className="status__dot" />
                Geen boek gevonden bij dit ISBN.
              </p>
              <button className="btn btn--secondary" onClick={scanAgain}>
                Opnieuw proberen
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="scanner__manual">
              <p className="status status--error">
                <span className="status__dot" />
                Er ging iets mis: {errorMsg}
              </p>
              <button className="btn btn--secondary" onClick={scanAgain}>
                Opnieuw proberen
              </button>
            </div>
          )}

          {status === 'preview' && result && (
            <div className="preview-card">
              <div className="preview-card__head">
                {result.coverUrl ? (
                  <div className="cover">
                    <img src={result.coverUrl} alt={`Cover van ${result.title}`} />
                  </div>
                ) : (
                  <div className={`cover cover--fallback ${coverTint(result.isbn ?? result.title)}`}>
                    <span className="cover__title">{result.title}</span>
                    <span className="cover__author">{lastNameOf(result.authors?.[0])}</span>
                  </div>
                )}
                <div className="preview-card__titles">
                  <span className="preview-card__title">{result.title}</span>
                  {result.authors && (
                    <span className="preview-card__author">{result.authors.join(', ')}</span>
                  )}
                  {result.categories.length > 0 && (
                    <div className="preview-card__tags">
                      {result.categories.map((c) => (
                        <span key={c} className="chip chip--static">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <p className="preview-card__summary">
                {result.summary ?? 'Nog geen samenvatting gevonden.'}
              </p>

              <div className="preview-card__actions">
                <button className="btn btn--primary" onClick={save}>
                  Toevoegen aan kast
                </button>
                <button className="btn btn--secondary" onClick={scanAgain}>
                  Ander boek
                </button>
              </div>

              {hasApiKey() ? (
                <>
                  <button
                    className="btn btn--ghost btn--block btn--sm"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoBusy}
                  >
                    {photoBusy ? 'Foto verwerken…' : '📷 Foto achterkant voor betere samenvatting'}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={onPhotoPicked}
                  />
                  {photoError && (
                    <p className="status status--error">
                      <span className="status__dot" />
                      {photoError}
                    </p>
                  )}
                </>
              ) : (
                <p className="source-note">
                  Stel een <Link to="/settings">Claude API-key</Link> in voor AI-samenvattingen
                  en de foto-fallback.
                </p>
              )}

              {result.summary && result.summarySource && (
                <p className="source-note">bron: {sourceLabel(result.summarySource)}</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
