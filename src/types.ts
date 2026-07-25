export type BookStatus = 'to-read' | 'read';

export type SummarySource = 'google' | 'wikipedia' | 'ai' | 'manual';

export interface Book {
  id: string;
  isbn?: string;
  title: string;
  authors?: string[];
  coverUrl?: string;
  summary?: string;
  summarySource?: SummarySource;
  categories: string[];
  status: BookStatus;
  note?: string;
  addedAt: number;
}
