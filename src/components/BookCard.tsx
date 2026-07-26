import { Link } from 'react-router-dom';
import type { Book } from '../types';
import { coverTint, lastNameOf } from '../lib/cover';

interface Props {
  book: Book;
}

export default function BookCard({ book }: Props) {
  const isRead = book.status === 'read';
  const authors = book.authors?.join(', ') ?? '';

  return (
    <Link
      to={`/book/${book.id}`}
      className={`book-card${isRead ? ' is-read' : ''}`}
      title={book.title}
    >
      {isRead && <span className="badge">Gelezen</span>}
      {book.coverUrl ? (
        <div className="cover">
          <img src={book.coverUrl} alt={`Cover van ${book.title}`} loading="lazy" />
        </div>
      ) : (
        <div className={`cover cover--fallback ${coverTint(book.isbn ?? book.id)}`}>
          <span className="cover__title">{book.title}</span>
          <span className="cover__author">{lastNameOf(book.authors?.[0])}</span>
        </div>
      )}
      <div className="book-card__meta">
        <span className="book-card__title">{book.title}</span>
        {authors && <span className="book-card__author">{authors}</span>}
      </div>
    </Link>
  );
}
