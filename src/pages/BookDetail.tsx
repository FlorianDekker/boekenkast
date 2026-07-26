import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateBook, deleteBook } from '../db';
import { hasApiKey, normalizeToDutch } from '../api/claude';
import Cover from '../components/Cover';
import CoverChooser from '../components/CoverChooser';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const book = useLiveQuery(() => (id ? db.books.get(id) : undefined), [id]);

  const [note, setNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [chooser, setChooser] = useState(false);
  useEffect(() => {
    if (book) setNote(book.note ?? '');
  }, [book?.id]);

  if (book === undefined) {
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
  if (book === null) {
    return (
      <div className="app app--plain">
        <header className="app-header app-header--sub">
          <button className="app-header__back" aria-label="Terug naar kast" onClick={() => navigate('/')}>
            ←
          </button>
          <span className="app-header__title">Terug naar kast</span>
        </header>
        <main className="app__main">
          <p className="helper" style={{ paddingTop: 24 }}>
            Boek niet gevonden.
          </p>
        </main>
      </div>
    );
  }

  const isRead = book.status === 'read';
  const authors = book.authors?.join(', ') ?? '';

  async function toggleRead() {
    if (!book) return;
    await updateBook(book.id, { status: isRead ? 'to-read' : 'read' });
  }

  async function saveNote() {
    if (!book) return;
    if ((book.note ?? '') !== note) {
      await updateBook(book.id, { note: note.trim() || undefined });
    }
  }

  async function regenerateSummary() {
    if (!book) return;
    setAiBusy(true);
    setAiError('');
    try {
      const nl = await normalizeToDutch({
        title: book.title,
        authors: book.authors,
        summary: book.summary,
        categories: book.categories,
      });
      await updateBook(book.id, {
        summary: nl.summary ?? book.summary,
        summarySource: nl.summary ? 'ai' : book.summarySource,
        categories: nl.categories.length ? nl.categories : book.categories,
      });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI-samenvatting mislukt');
    } finally {
      setAiBusy(false);
    }
  }

  async function pickCover(url: string | null) {
    if (!book) return;
    await updateBook(book.id, { coverUrl: url ?? undefined, coverHidden: url === null });
    setChooser(false);
  }

  async function remove() {
    if (!book) return;
    if (confirm(`"${book.title}" uit je kast verwijderen?`)) {
      await deleteBook(book.id);
      navigate('/');
    }
  }

  return (
    <div className="app app--plain">
      <header className="app-header app-header--sub">
        <button className="app-header__back" aria-label="Terug naar kast" onClick={() => navigate('/')}>
          ←
        </button>
        <span className="app-header__title">Terug naar kast</span>
      </header>

      <main className="app__main">
        <div className="book-detail">
          <div className="book-detail__hero">
            <Cover
              url={book.coverUrl}
              isbn={book.isbn}
              title={book.title}
              author={book.authors?.[0]}
              seed={book.isbn ?? book.id}
              hidden={book.coverHidden}
            />
            <div className="book-detail__titles">
              <h1 className="book-detail__title">{book.title}</h1>
              {authors && <span className="book-detail__author">{authors}</span>}
              {book.categories.length > 0 && (
                <div className="book-detail__tags">
                  {book.categories.map((c) => (
                    <span key={c} className="chip chip--static">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="book-detail__cover-actions">
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setChooser((v) => !v)}
            >
              {chooser ? 'Sluiten' : 'Ander omslag kiezen'}
            </button>
          </div>
          {chooser && (
            <CoverChooser
              book={{ isbn: book.isbn, title: book.title, authors: book.authors }}
              onPick={pickCover}
              onClose={() => setChooser(false)}
            />
          )}

          <button className="toggle-row" role="switch" aria-checked={isRead} onClick={toggleRead}>
            <span className="toggle-row__label">Gelezen</span>
            <span className="switch" aria-checked={isRead} />
          </button>

          <div className="summary section">
            <h2 className="section__title">Samenvatting</h2>
            <div className="summary__body">
              <p>{book.summary ?? 'Nog geen samenvatting.'}</p>
            </div>
            {hasApiKey() && (
              <button
                className="btn btn--secondary btn--sm"
                onClick={regenerateSummary}
                disabled={aiBusy}
              >
                {aiBusy ? 'AI schrijft…' : 'Uitgebreide samenvatting via AI'}
              </button>
            )}
            {aiError && (
              <p className="status status--error">
                <span className="status__dot" />
                {aiError}
              </p>
            )}
          </div>

          <div className="note-field section">
            <h2 className="section__title">Mijn notitie</h2>
            <textarea
              className="textarea"
              placeholder="Waarom wil je dit lezen? Eigen gedachten…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
            />
          </div>

          <div className="book-detail__danger">
            <button className="btn btn--danger btn--sm" onClick={remove}>
              Verwijder uit kast
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
