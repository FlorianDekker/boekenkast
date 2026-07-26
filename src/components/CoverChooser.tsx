import { useEffect, useMemo, useState } from 'react';
import { fetchCoverCandidates } from '../api/covers';
import { hasApiKey, findCoverImageUrls } from '../api/claude';
import { isPlaceholderImage } from '../lib/cover';

interface Props {
  book: { isbn?: string; title: string; authors?: string[] };
  onPick: (url: string | null) => void; // null = gekleurde rug
  onClose: () => void;
}

// Eén kandidaat: verbergt zichzelf als het plaatje kapot of een placeholder is.
function Candidate({ url, onPick }: { url: string; onPick: () => void }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <button type="button" className="cover-choice" onClick={onPick}>
      <img
        src={url}
        alt="Mogelijke omslag"
        onError={() => setOk(false)}
        onLoad={(e) => {
          if (isPlaceholderImage(e.currentTarget)) setOk(false);
        }}
      />
    </button>
  );
}

export default function CoverChooser({ book, onPick, onClose }: Props) {
  const [urls, setUrls] = useState<string[] | null>(null);
  const [aiUrls, setAiUrls] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [aiError, setAiError] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  useEffect(() => {
    let active = true;
    fetchCoverCandidates(book).then((list) => {
      if (active) setUrls(list);
    });
    return () => {
      active = false;
    };
  }, [book.isbn, book.title]);

  // Basis + online (AI) resultaten samengevoegd, zonder dubbele.
  const all = useMemo(() => [...new Set([...(urls ?? []), ...aiUrls])], [urls, aiUrls]);

  async function aiSearch() {
    setAiBusy(true);
    setAiError('');
    try {
      const found = await findCoverImageUrls(book);
      setAiUrls(found);
      setAiDone(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Online zoeken mislukt');
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="cover-chooser">
      <p className="helper">Kies een omslag:</p>
      {urls === null ? (
        <p className="helper">Omslagen zoeken…</p>
      ) : (
        <div className="cover-choices">
          {all.map((u) => (
            <Candidate key={u} url={u} onPick={() => onPick(u)} />
          ))}
          <button
            type="button"
            className="cover-choice cover-choice--spine"
            onClick={() => onPick(null)}
          >
            Gekleurde rug
          </button>
        </div>
      )}

      {hasApiKey() && (
        <button type="button" className="btn btn--secondary btn--sm" onClick={aiSearch} disabled={aiBusy}>
          {aiBusy ? 'Online zoeken…' : '🔎 Zoek online (AI)'}
        </button>
      )}
      {aiDone && aiUrls.length === 0 && !aiError && (
        <p className="helper">Online geen extra omslagen gevonden.</p>
      )}
      {aiError && (
        <p className="status status--error">
          <span className="status__dot" />
          {aiError}
        </p>
      )}

      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          const u = manualUrl.trim();
          if (u) onPick(u);
        }}
      >
        <label className="field__label">Of plak een link naar een afbeelding</label>
        <div className="scanner__manual-row">
          <input
            className="input"
            type="url"
            inputMode="url"
            placeholder="https://…/omslag.jpg"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
          />
          <button type="submit" className="btn btn--secondary" disabled={!manualUrl.trim()}>
            Gebruik
          </button>
        </div>
      </form>

      <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
        Sluiten
      </button>
    </div>
  );
}
