import { useEffect, useState } from 'react';
import { fetchCoverCandidates } from '../api/covers';
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

  useEffect(() => {
    let active = true;
    fetchCoverCandidates(book).then((list) => {
      if (active) setUrls(list);
    });
    return () => {
      active = false;
    };
  }, [book.isbn, book.title]);

  return (
    <div className="cover-chooser">
      <p className="helper">Kies een omslag:</p>
      {urls === null ? (
        <p className="helper">Omslagen zoeken…</p>
      ) : (
        <div className="cover-choices">
          {urls.map((u) => (
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
      <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
        Sluiten
      </button>
    </div>
  );
}
