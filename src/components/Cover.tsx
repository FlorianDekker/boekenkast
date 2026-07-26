import { useState } from 'react';
import { coverTint, lastNameOf, isPlaceholderImage } from '../lib/cover';
import { googleCoverByIsbn } from '../api/googleBooks';

interface Props {
  url?: string;
  isbn?: string;
  title: string;
  author?: string;
  seed: string;
  hidden?: boolean; // toon altijd de gekleurde rug, ook als er een cover zou zijn
}

// Toont de boekcover. Is er geen "echte" cover maar wel een ISBN, dan proberen
// we Google's cover-by-ISBN (vindt vaak óók Nederlandse covers). Lukt niets, dan
// een nette gekleurde rug met titel + auteur (deterministische tint per boek).
export default function Cover({ url, isbn, title, author, seed, hidden }: Props) {
  const [broken, setBroken] = useState(false);
  const src = hidden ? undefined : url ?? (isbn ? googleCoverByIsbn(isbn) : undefined);

  if (src && !broken) {
    return (
      <div className="cover">
        <img
          src={src}
          alt={`Cover van ${title}`}
          loading="lazy"
          onError={() => setBroken(true)}
          onLoad={(e) => {
            if (isPlaceholderImage(e.currentTarget)) setBroken(true);
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
