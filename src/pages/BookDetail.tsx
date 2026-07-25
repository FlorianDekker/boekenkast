import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateBook, deleteBook } from '../db';
import { hasApiKey, normalizeToDutch } from '../api/claude';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const book = useLiveQuery(() => (id ? db.books.get(id) : undefined), [id]);

  // Lokale kopie van de notitie zodat typen soepel gaat; we bewaren bij blur.
  const [note, setNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  useEffect(() => {
    if (book) setNote(book.note ?? '');
  }, [book?.id]);

  if (book === undefined) {
    return <p className="muted">Laden…</p>;
  }
  if (book === null) {
    return (
      <div>
        <p>Boek niet gevonden.</p>
        <button type="button" className="link-btn" onClick={() => navigate('/')}>
          ← Terug naar kast
        </button>
      </div>
    );
  }

  const isRead = book.status === 'read';

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

  async function remove() {
    if (!book) return;
    if (confirm(`"${book.title}" uit je kast verwijderen?`)) {
      await deleteBook(book.id);
      navigate('/');
    }
  }

  return (
    <div className="book-detail">
      <button type="button" className="link-btn back" onClick={() => navigate('/')}>
        ← Terug naar kast
      </button>

      <div className="detail-head">
        {book.coverUrl ? (
          <img className="detail-cover" src={book.coverUrl} alt={`Cover van ${book.title}`} />
        ) : (
          <div className="detail-cover cover-fallback">{book.title}</div>
        )}
        <div className="detail-info">
          <h2>{book.title}</h2>
          {book.authors && book.authors.length > 0 && (
            <p className="muted">{book.authors.join(', ')}</p>
          )}
          {book.categories.length > 0 && (
            <p className="chips">
              {book.categories.map((c) => (
                <span key={c} className="chip">
                  {c}
                </span>
              ))}
            </p>
          )}
          <button
            type="button"
            className={isRead ? 'btn' : 'btn ghost'}
            onClick={toggleRead}
          >
            {isRead ? '✓ Gelezen' : 'Markeer als gelezen'}
          </button>
        </div>
      </div>

      <section className="detail-section">
        <h3>Samenvatting</h3>
        <p>{book.summary ?? 'Nog geen samenvatting.'}</p>
        {hasApiKey() && (
          <button
            type="button"
            className="btn ghost small"
            onClick={regenerateSummary}
            disabled={aiBusy}
          >
            {aiBusy ? 'AI schrijft…' : '🔄 Uitgebreide samenvatting via AI (NL)'}
          </button>
        )}
        {aiError && <p className="scanner-error">{aiError}</p>}
      </section>

      <section className="detail-section">
        <h3>Mijn notitie</h3>
        <textarea
          className="note-field"
          placeholder="Waarom wil je dit lezen? Eigen gedachten…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          rows={4}
        />
      </section>

      <button type="button" className="btn danger" onClick={remove}>
        Verwijder uit kast
      </button>
    </div>
  );
}
