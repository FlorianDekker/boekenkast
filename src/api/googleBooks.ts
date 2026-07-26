import type { Book } from '../types';

// Resultaat van het opzoeken: alle boekvelden behalve wat we zelf zetten
// (id, addedAt, status). isbn wordt meegegeven.
export type LookupResult = Pick<
  Book,
  'isbn' | 'title' | 'authors' | 'coverUrl' | 'summary' | 'summarySource' | 'categories'
>;

interface GoogleVolume {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleVolume[];
}

// Google Books geeft http-cover-links; forceer https zodat ze op een https-site laden.
function toHttps(url?: string): string | undefined {
  return url?.replace(/^http:/, 'https:');
}

async function queryGoogle(q: string): Promise<GoogleVolume | null> {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1`,
  );
  if (!res.ok) {
    throw new Error(`Google Books gaf status ${res.status}`);
  }
  const data: GoogleBooksResponse = await res.json();
  return data.items?.[0] ?? null;
}

export async function fetchBookByIsbn(isbn: string): Promise<LookupResult | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, '');

  // Eerst de exacte isbn:-zoekopdracht; vindt die niks, dan een gewone query
  // (sommige (Nederlandse) edities komen alleen zo boven water).
  let volume = await queryGoogle(`isbn:${clean}`);
  if (!volume) volume = await queryGoogle(clean);

  const info = volume?.volumeInfo;
  if (!info || !info.title) {
    return null;
  }

  const description = info.description?.trim();
  return {
    isbn: clean,
    title: info.title,
    authors: info.authors,
    coverUrl: toHttps(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
    summary: description || undefined,
    summarySource: description ? 'google' : undefined,
    categories: info.categories ?? [],
  };
}

// Cover-afbeelding rechtstreeks uit Google's boekomslag-endpoint (los van de
// API, dus geen quota-limiet). Werkt vaak óók voor Nederlandse boeken waar de
// metadata-API geen cover meegaf. Geeft een 128×170-placeholder als er geen
// cover is — die vangt de Cover-component af.
export function googleCoverByIsbn(isbn: string): string {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  return `https://books.google.com/books/content?vid=ISBN${clean}&printsec=frontcover&img=1&zoom=1`;
}
