import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db, addBook, newId } from '../db';
import type { Book } from '../types';
import BookCard from '../components/BookCard';

// Tijdelijke voorbeeldboeken om opslag te testen. Verdwijnt later.
const SAMPLES: Omit<Book, 'id' | 'addedAt'>[] = [
  {
    title: 'Sapiens',
    authors: ['Yuval Noah Harari'],
    coverUrl: 'https://books.google.com/books/content?id=FmyBAwAAQBAJ&printsec=frontcover&img=1&zoom=1',
    summary: 'Een beknopte geschiedenis van de mensheid.',
    summarySource: 'manual',
    categories: ['Geschiedenis', 'Non-fictie'],
    status: 'to-read',
  },
  {
    title: 'Dune',
    authors: ['Frank Herbert'],
    coverUrl: 'https://books.google.com/books/content?id=B1hSG45JCX4C&printsec=frontcover&img=1&zoom=1',
    summary: 'Sciencefiction-epos op de woestijnplaneet Arrakis.',
    summarySource: 'manual',
    categories: ['Sciencefiction', 'Fictie'],
    status: 'to-read',
  },
];

export default function Library() {
  const books = useLiveQuery(() => db.books.orderBy('addedAt').reverse().toArray());
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [onlyToRead, setOnlyToRead] = useState(false);

  // Unieke categorieën over de hele kast, alfabetisch.
  const categories = useMemo(() => {
    const set = new Set<string>();
    books?.forEach((b) => b.categories.forEach((c) => set.add(c)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [books]);

  const filtered = useMemo(() => {
    if (!books) return [];
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      if (onlyToRead && b.status !== 'to-read') return false;
      if (activeCategory && !b.categories.includes(activeCategory)) return false;
      if (q) {
        const inTitle = b.title.toLowerCase().includes(q);
        const inAuthor = b.authors?.some((a) => a.toLowerCase().includes(q));
        if (!inTitle && !inAuthor) return false;
      }
      return true;
    });
  }, [books, search, activeCategory, onlyToRead]);

  async function addSample() {
    const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    await addBook({ ...sample, id: newId(), addedAt: Date.now() });
  }

  if (books === undefined) {
    return <p className="muted">Laden…</p>;
  }

  return (
    <div className="library">
      <div className="library-toolbar">
        <span className="count">
          {filtered.length}
          {filtered.length !== books.length ? ` / ${books.length}` : ''}{' '}
          {books.length === 1 ? 'boek' : 'boeken'}
        </span>
        <div className="row">
          <button type="button" className="btn ghost" onClick={addSample}>
            + Voorbeeld
          </button>
          <Link to="/scan" className="btn">
            📷 Scan boek
          </Link>
        </div>
      </div>

      {books.length > 0 && (
        <div className="filters">
          <input
            className="search"
            type="search"
            placeholder="Zoek op titel of auteur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="toread-toggle">
            <input
              type="checkbox"
              checked={onlyToRead}
              onChange={(e) => setOnlyToRead(e.target.checked)}
            />
            Alleen te-lezen
          </label>
          {categories.length > 0 && (
            <div className="category-chips">
              <button
                type="button"
                className={`chip filter ${activeCategory === null ? 'active' : ''}`}
                onClick={() => setActiveCategory(null)}
              >
                Alle
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip filter ${activeCategory === c ? 'active' : ''}`}
                  onClick={() => setActiveCategory(activeCategory === c ? null : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {books.length === 0 ? (
        <div className="empty">
          <p>Je kast is nog leeg.</p>
          <p className="muted">
            Scan een boek via de knop hierboven, of voeg een voorbeeldboek toe om
            de opslag te testen.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <p className="muted">Geen boeken die aan je filter voldoen.</p>
        </div>
      ) : (
        <div className="shelf">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
