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
