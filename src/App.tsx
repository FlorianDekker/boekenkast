import { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
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
    <div className="app">
      <header className="app-header">
        <NavLink to="/" className="brand">
          📚 Mijn Boekenkast
        </NavLink>
        <NavLink to="/settings" className="settings-link" title="Instellingen">
          ⚙️
        </NavLink>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/book/:id" element={<BookDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
