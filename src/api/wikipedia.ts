interface WikiPage {
  title: string;
  extract?: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

// Kies uit de zoekresultaten de pagina die het best bij titel + auteur past.
// Voorkomt dat we per ongeluk de auteurspagina of een vervolgdeel pakken.
function pickBest(pages: WikiPage[], title: string, author?: string): WikiPage | null {
  const nt = normalize(title);
  const surname = author ? normalize(author).split(' ').pop() ?? '' : '';
  let best: WikiPage | null = null;
  let bestScore = -Infinity;

  for (const p of pages) {
    const pt = normalize(p.title);
    const ex = normalize(p.extract ?? '');
    let score = 0;
    if (pt === nt) score += 5;
    else if (nt.includes(pt) || pt.includes(nt)) score += 3;
    if (surname && ex.includes(surname)) score += 2;
    if (/\b(book|novel|memoir|non-fiction)\b/.test((p.extract ?? '').toLowerCase())) score += 1;
    if (surname && pt === surname) score -= 5; // straf: dit is de auteurspagina
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  // Alleen accepteren als de titel echt (deels) matcht — anders liever niks.
  return bestScore >= 3 ? best : null;
}

async function searchWiki(
  lang: 'nl' | 'en',
  title: string,
  author?: string,
): Promise<string | undefined> {
  const query = [title, author].filter(Boolean).join(' ');
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json` +
    '&prop=extracts&exintro&explaintext&redirects=1' +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=6&origin=*`;

  const res = await fetch(url);
  if (!res.ok) return undefined;
  const data = await res.json();
  const pages: WikiPage[] = Object.values(data?.query?.pages ?? {});
  if (pages.length === 0) return undefined;

  const best = pickBest(pages, title, author);
  const extract = best?.extract?.trim();
  if (!extract) return undefined;

  // Beperk tot een behapbare lengte.
  return extract.length > 700 ? `${extract.slice(0, 700).trim()}…` : extract;
}

// Zoekt een samenvatting op Wikipedia: eerst Nederlandstalig, dan Engelstalig.
// Gratis en browservriendelijk dankzij origin=* (CORS).
export async function fetchWikipediaSummary(
  title: string,
  author?: string,
): Promise<{ summary: string; lang: 'nl' | 'en' } | undefined> {
  const nl = await searchWiki('nl', title, author);
  if (nl) return { summary: nl, lang: 'nl' };
  const en = await searchWiki('en', title, author);
  if (en) return { summary: en, lang: 'en' };
  return undefined;
}
