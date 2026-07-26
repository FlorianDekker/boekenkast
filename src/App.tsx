import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { migrateCategoriesToDutch } from './db';
import Library from './pages/Library';
import ScanPage from './pages/ScanPage';
import BookDetail from './pages/BookDetail';
import Settings from './pages/Settings';
import './App.css';

export default function App() {
  // Zet bestaande boeken alsnog naar Nederlandse categorieën.
  useEffect(() => {
    migrateCategoriesToDutch();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Library />} />
      <Route path="/scan" element={<ScanPage />} />
      <Route path="/book/:id" element={<BookDetail />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
