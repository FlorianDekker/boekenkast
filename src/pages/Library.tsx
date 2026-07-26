import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db';
import BookCard from '../components/BookCard';

export default function Library() {
  const books = useLiveQuery(() => db.books.orderBy('addedAt').reverse().toArray());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Alles');

  // Unieke categorieën over de hele kast, alfabetisch.
  const categories = useMemo(() => {
    const set = new Set<string>();
    books?.forEach((b) => b.categories.forEach((c) => set.add(c)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [books]);

  // Filter-opties met tellingen (Alles / Te lezen / per categorie).
  const options = useMemo(() => {
    const all = books ?? [];
    const opts = [
      { value: 'Alles', label: `Alles (${all.length})` },
      { value: 'Te lezen', label: `Te lezen (${all.filter((b) => b.status === 'to-read').length})` },
    ];
    for (const c of categories) {
      opts.push({ value: c, label: `${c} (${all.filter((b) => b.categories.includes(c)).length})` });
    }
    return opts;
  }, [books, categories]);

  const filtered = useMemo(() => {
    if (!books) return [];
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      if (filter === 'Te lezen' && b.status !== 'to-read') return false;
      if (filter !== 'Alles' && filter !== 'Te lezen' && !b.categories.includes(filter)) return false;
      if (q) {
        const inTitle = b.title.toLowerCase().includes(q);
        const inAuthor = b.authors?.some((a) => a.toLowerCase().includes(q));
        if (!inTitle && !inAuthor) return false;
      }
      return true;
    });
  }, [books, search, filter]);

  if (books === undefined) {
    return (
      <div className="app app--plain">
        <main className="app__main">
          <p className="helper" style={{ paddingTop: 24 }}>
            Laden…
          </p>
        </main>
      </div>
    );
  }

  const readCount = books.filter((b) => b.status === 'read').length;
  const counterLabel = `${books.length} boeken · ${readCount} gelezen · ${books.length - readCount} te lezen`;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__row">
          <div className="app-header__titles">
            <span className="eyebrow">Nog te lezen</span>
            <span className="app-header__title">Mijn boekenkast</span>
          </div>
          <Link to="/settings" className="btn btn--ghost btn--sm">
            Instellingen
          </Link>
        </div>

        <div className="search">
          <input
            className="input"
            type="search"
            placeholder="Zoek op titel of auteur"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search__clear" aria-label="Wissen" onClick={() => setSearch('')}>
              ✕
            </button>
          )}
        </div>

        <div className="app-header__row">
          <div className={`select${filter !== 'Alles' ? ' is-active' : ''}`}>
            <label className="visually-hidden" htmlFor="cat">
              Categorie
            </label>
            <select id="cat" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <span className="app-header__count">{counterLabel}</span>
        </div>
      </header>

      <main className="app__main">
        {filtered.length > 0 ? (
          <div className="shelf">
            {filtered.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty__mark" />
            <span className="empty__title">
              {books.length === 0 ? 'Nog geen boeken' : 'Niets gevonden'}
            </span>
            <p className="empty__body">
              {books.length === 0
                ? 'Scan de achterkant van een boek dat je nog wilt lezen en het staat meteen in je kast.'
                : 'Geen boek dat aan deze zoekopdracht of dit filter voldoet.'}
            </p>
            {books.length === 0 && (
              <Link to="/scan" className="btn btn--primary">
                Scan je eerste boek
              </Link>
            )}
          </div>
        )}
      </main>

      <div className="actions-bar">
        <Link to="/scan" className="btn btn--primary">
          Scan boek
        </Link>
      </div>
    </div>
  );
}
