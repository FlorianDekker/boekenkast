import type { LookupResult } from './googleBooks';

interface OpenLibraryBook {
  title?: string;
  authors?: { name: string }[];
  subjects?: { name: string }[];
  cover?: { large?: string; medium?: string; small?: string };
  notes?: string | { value: string };
  excerpts?: { text: string }[];
}

// Open Library als tweede bron: gratis, geen limiet, geeft titel/auteurs/onderwerpen/cover.
// Samenvattingen zijn hier zeldzaam — die vullen we later eventueel via de foto-fallback.
export async function fetchBookByIsbnOpenLibrary(isbn: string): Promise<LookupResult | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`,
  );
  if (!res.ok) {
    throw new Error(`Open Library gaf status ${res.status}`);
  }
  const data: Record<string, OpenLibraryBook> = await res.json();
  const book = data[`ISBN:${clean}`];
  if (!book || !book.title) {
    return null;
  }

  const excerpt = book.excerpts?.[0]?.text?.trim();
  const summary =
    excerpt || (typeof book.notes === 'string' ? book.notes : book.notes?.value)?.trim();

  return {
    isbn: clean,
    title: book.title,
    authors: book.authors?.map((a) => a.name),
    coverUrl: book.cover?.medium ?? book.cover?.large ?? book.cover?.small,
    summary: summary || undefined,
    summarySource: summary ? 'google' : undefined,
    categories: (book.subjects ?? []).slice(0, 6).map((s) => s.name),
  };
}

interface OpenLibrarySearchDoc {
  title?: string;
  author_name?: string[];
  cover_i?: number;
  subject?: string[];
}

// Open Library's zoek-API vindt soms edities die de data-API mist.
// Levert cover via cover_i.
export async function fetchByIsbnOpenLibrarySearch(isbn: string): Promise<LookupResult | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  const res = await fetch(
    `https://openlibrary.org/search.json?isbn=${clean}&fields=title,author_name,cover_i,subject&limit=1`,
  );
  if (!res.ok) {
    throw new Error(`Open Library-zoekopdracht gaf status ${res.status}`);
  }
  const data: { docs?: OpenLibrarySearchDoc[] } = await res.json();
  const doc = data.docs?.[0];
  if (!doc || !doc.title) {
    return null;
  }

  return {
    isbn: clean,
    title: doc.title,
    authors: doc.author_name,
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : undefined,
    summary: undefined,
    summarySource: undefined,
    categories: (doc.subject ?? []).slice(0, 6),
  };
}
