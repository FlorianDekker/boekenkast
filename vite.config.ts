import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serveert de app op een subpad: /boekenkast/.
// In dev houden we het op de root (/), in productie op het subpad.
const PROD_BASE = '/boekenkast/'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const base = mode === 'production' ? PROD_BASE : '/'
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png'],
        manifest: {
          name: 'Mijn Boekenkast',
          short_name: 'Boekenkast',
          description: 'Scan boeken en bouw je to-read boekenkast.',
          lang: 'nl',
          theme_color: '#f6efe4',
          background_color: '#f6efe4',
          display: 'standalone',
          start_url: base,
          scope: base,
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
  }
})
