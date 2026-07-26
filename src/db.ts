import Dexie, { type EntityTable } from 'dexie';
import type { Book } from './types';
import { translateCategoriesLocal } from './i18n/categories';

// Lokale IndexedDB-database voor de boekenkast.
export const db = new Dexie('BoekenkastDB') as Dexie & {
  books: EntityTable<Book, 'id'>;
};

db.version(1).stores({
  // Geïndexeerd op id (primary), plus velden waarop we sorteren/filteren.
  books: 'id, title, status, addedAt',
});

export function newId(): string {
  return crypto.randomUUID();
}

export async function addBook(book: Book): Promise<void> {
  await db.books.add(book);
}

export async function updateBook(id: string, changes: Partial<Book>): Promise<void> {
  await db.books.update(id, changes);
}

export async function deleteBook(id: string): Promise<void> {
  await db.books.delete(id);
}

export async function clearAllBooks(): Promise<void> {
  await db.books.clear();
}

export async function getBook(id: string): Promise<Book | undefined> {
  return db.books.get(id);
}

// --- Back-up: export & import ---

// Exporteer de hele kast als JSON-string (voor download).
export async function exportBooksJson(): Promise<string> {
  const books = await db.books.toArray();
  return JSON.stringify({ version: 1, exportedAt: Date.now(), books }, null, 2);
}

// Importeer boeken uit een eerder geëxporteerd JSON-bestand.
// Boeken met hetzelfde id worden overschreven (upsert); nieuwe komen erbij.
export async function importBooksJson(json: string): Promise<number> {
  const data = JSON.parse(json) as { books?: Book[] };
  if (!Array.isArray(data.books)) {
    throw new Error('Ongeldig back-upbestand: geen "books"-lijst gevonden.');
  }
  // Minimale validatie zodat we geen rommel importeren.
  const valid = data.books.filter(
    (b) => b && typeof b.id === 'string' && typeof b.title === 'string',
  );
  await db.books.bulkPut(valid);
  return valid.length;
}

// Eenmalige, idempotente migratie: zet categorieën van bestaande boeken alsnog
// naar het Nederlands (via het woordenboek). Schrijft alleen bij een wijziging.
export async function migrateCategoriesToDutch(): Promise<void> {
  const books = await db.books.toArray();
  for (const book of books) {
    const translated = translateCategoriesLocal(book.categories);
    if (translated.join('|') !== book.categories.join('|')) {
      await db.books.update(book.id, { categories: translated });
    }
  }
}
