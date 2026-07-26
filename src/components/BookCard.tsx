import { Link } from 'react-router-dom';
import type { Book } from '../types';
import Cover from './Cover';

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
      <Cover
        url={book.coverUrl}
        isbn={book.isbn}
        title={book.title}
        author={book.authors?.[0]}
        seed={book.isbn ?? book.id}
      />
      <div className="book-card__meta">
        <span className="book-card__title">{book.title}</span>
        {authors && <span className="book-card__author">{authors}</span>}
      </div>
    </Link>
  );
}
