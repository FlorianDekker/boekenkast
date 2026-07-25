import { useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BarcodeScanner from '../scan/BarcodeScanner';
import { lookupBook, type LookupResult } from '../api/lookup';
import { hasApiKey, summarizeFromPhoto } from '../api/claude';
import { addBook, newId } from '../db';

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
    e.target.value = ''; // sta toe dezelfde foto opnieuw te kiezen
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
    <div className="scan-page">
      <h2>Boek toevoegen</h2>

      {status === 'scanning' && (
        <>
          <BarcodeScanner onDetected={lookup} />
          <form className="manual-isbn" onSubmit={onManualSubmit}>
            <label htmlFor="isbn">Of voer het ISBN handmatig in:</label>
            <div className="row">
              <input
                id="isbn"
                inputMode="numeric"
                placeholder="bijv. 9780143127741"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
              />
              <button type="submit" className="btn">
                Zoek
              </button>
            </div>
          </form>
        </>
      )}

      {status === 'looking-up' && <p className="muted">Boek opzoeken…</p>}

      {status === 'not-found' && (
        <div className="scan-result">
          <p>Geen boek gevonden voor dit ISBN.</p>
          <button type="button" className="btn" onClick={scanAgain}>
            Opnieuw proberen
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="scan-result">
          <p>Er ging iets mis: {errorMsg}</p>
          <button type="button" className="btn" onClick={scanAgain}>
            Opnieuw proberen
          </button>
        </div>
      )}

      {status === 'preview' && result && (
        <div className="scan-result">
          <div className="preview-card">
            {result.coverUrl ? (
              <img src={result.coverUrl} alt={`Cover van ${result.title}`} />
            ) : (
              <div className="preview-cover-fallback">{result.title}</div>
            )}
            <div className="preview-info">
              <h3>{result.title}</h3>
              {result.authors && <p className="muted">{result.authors.join(', ')}</p>}
              {result.categories.length > 0 && (
                <p className="chips">
                  {result.categories.map((c) => (
                    <span key={c} className="chip">
                      {c}
                    </span>
                  ))}
                </p>
              )}
              <p className="preview-summary">
                {result.summary ?? 'Nog geen samenvatting gevonden.'}
              </p>
              {result.summary && result.summarySource && (
                <p className="source-note">
                  bron:{' '}
                  {result.summarySource === 'google'
                    ? 'Google Books'
                    : result.summarySource === 'wikipedia'
                      ? 'Wikipedia'
                      : result.summarySource === 'ai'
                        ? 'AI (Claude)'
                        : result.summarySource}
                </p>
              )}

              {hasApiKey() ? (
                <>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoBusy}
                  >
                    {photoBusy ? 'Foto verwerken…' : '📷 Betere samenvatting via foto achterkant'}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={onPhotoPicked}
                  />
                  {photoError && <p className="scanner-error">{photoError}</p>}
                </>
              ) : (
                <p className="source-note">
                  Stel een <Link to="/settings">Claude API-key</Link> in voor Nederlandse
                  AI-samenvattingen en de foto-fallback.
                </p>
              )}
            </div>
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={save}>
              Toevoegen aan kast
            </button>
            <button type="button" className="btn ghost" onClick={scanAgain}>
              Ander boek
            </button>
          </div>
        </div>
      )}

      <button type="button" className="link-btn" onClick={() => navigate('/')}>
        ← Terug naar kast
      </button>
    </div>
  );
}
