import { Link } from 'react-router-dom';
import type { Book } from '../types';

interface Props {
  book: Book;
}

export default function BookCard({ book }: Props) {
  return (
    <Link to={`/book/${book.id}`} className="book-card" title={book.title}>
      <div className="cover">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={`Cover van ${book.title}`} loading="lazy" />
        ) : (
          <div className="cover-fallback">
            <span>{book.title}</span>
          </div>
        )}
        {book.status === 'read' && <span className="read-badge">✓ Gelezen</span>}
      </div>
      <div className="book-meta">
        <h3 className="book-title">{book.title}</h3>
        {book.authors && book.authors.length > 0 && (
          <p className="book-authors">{book.authors.join(', ')}</p>
        )}
      </div>
    </Link>
  );
}
