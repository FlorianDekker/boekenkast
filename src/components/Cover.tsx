import { useState } from 'react';
import { coverTint, lastNameOf } from '../lib/cover';
import { googleCoverByIsbn } from '../api/googleBooks';

interface Props {
  url?: string;
  isbn?: string;
  title: string;
  author?: string;
  seed: string;
}

// Google's "geen afbeelding beschikbaar"-placeholder is exact 128×170px.
// Behandel dat (en 1×1-pixels) als "geen cover".
function isPlaceholder(img: HTMLImageElement): boolean {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w <= 1 || h <= 1) return true;
  return w === 128 && h === 170;
}

// Toont de boekcover. Is er geen "echte" cover maar wel een ISBN, dan proberen
// we Google's cover-by-ISBN (vindt vaak óók Nederlandse covers). Lukt niets, dan
// een nette gekleurde rug met titel + auteur (deterministische tint per boek).
export default function Cover({ url, isbn, title, author, seed }: Props) {
  const [broken, setBroken] = useState(false);
  const src = url ?? (isbn ? googleCoverByIsbn(isbn) : undefined);

  if (src && !broken) {
    return (
      <div className="cover">
        <img
          src={src}
          alt={`Cover van ${title}`}
          loading="lazy"
          onError={() => setBroken(true)}
          onLoad={(e) => {
            if (isPlaceholder(e.currentTarget)) setBroken(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`cover cover--fallback ${coverTint(seed)}`}>
      <span className="cover__title">{title}</span>
      <span className="cover__author">{lastNameOf(author)}</span>
    </div>
  );
}
