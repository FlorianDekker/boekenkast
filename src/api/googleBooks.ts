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

export async function fetchBookByIsbn(isbn: string): Promise<LookupResult | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(clean)}`,
  );
  if (!res.ok) {
    throw new Error(`Google Books gaf status ${res.status}`);
  }
  const data: GoogleBooksResponse = await res.json();
  const info = data.items?.[0]?.volumeInfo;
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
