import { googleCoverByIsbn } from './googleBooks';

interface CandidateInput {
  isbn?: string;
  title: string;
  authors?: string[];
}

// Haalt kandidaat-omslagen op uit meerdere bronnen, zodat de gebruiker kan
// kiezen als het automatische plaatje niet klopt. Placeholders/kapotte plaatjes
// worden pas in de UI weggefilterd (bij het laden).
export async function fetchCoverCandidates(book: CandidateInput): Promise<string[]> {
  const urls = new Set<string>();
  const author = book.authors?.[0];

  // 1. Google's cover-by-ISBN (het huidige plaatje) — als optie meenemen.
  if (book.isbn) urls.add(googleCoverByIsbn(book.isbn));

  // 2. Google Books: zoek op titel + auteur, verzamel omslagen van edities.
  try {
    const q = `intitle:${book.title}${author ? ` inauthor:${author}` : ''}`;
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8`,
    );
    if (res.ok) {
      const data = await res.json();
      for (const item of data.items ?? []) {
        const links = item.volumeInfo?.imageLinks;
        const t: string | undefined = links?.thumbnail ?? links?.smallThumbnail;
        if (t) urls.add(t.replace(/^http:/, 'https:'));
      }
    }
  } catch {
    /* negeren: bron mag falen */
  }

  // 3. Open Library: zoek op titel (+ auteur) en verzamel covers via cover_i.
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(book.title)}` +
        `${author ? `&author=${encodeURIComponent(author)}` : ''}&fields=cover_i&limit=8`,
    );
    if (res.ok) {
      const data = await res.json();
      for (const doc of data.docs ?? []) {
        if (doc.cover_i) urls.add(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`);
      }
    }
  } catch {
    /* negeren */
  }

  return [...urls];
}
