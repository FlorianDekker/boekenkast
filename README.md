# Mijn Boekenkast 📚

Een web-app (PWA) om fysieke boeken te scannen (ISBN-barcode) en digitaal te
verzamelen als "to-read" boekenkast. Per boek: titel, cover, Nederlandse
samenvatting en categorieën. Data staat **lokaal** in je browser (IndexedDB).

## Functies
- 📷 ISBN-barcode scannen (of handmatig ISBN invoeren)
- Boekdata via Google Books → Open Library → Wikipedia (Nederlandstalig)
- Optioneel: **Claude** maakt nette Nederlandse samenvattingen + categorieën,
  en kan de achterkant van een boek samenvatten via een foto
- Gelezen/te-lezen markeren, zoeken op titel/auteur, filteren op categorie,
  eigen notitie per boek
- Export/import als back-up (JSON)
- Installeerbaar op je telefoon (PWA)

## Lokaal draaien
```bash
npm install
npm run dev        # http://localhost:5173
```
De camera werkt op `localhost` en op elke `https`-site.

## Claude API-key
Voor Nederlandse AI-samenvattingen: open ⚙️ Instellingen in de app en plak je
Claude API-key (`sk-ant-…`). De key wordt **alleen lokaal** bewaard.

> ⚠️ Dit is een browser-app zonder server. Voor persoonlijk/lokaal gebruik is dat
> prima. Zet je de app **publiek online**, gebruik dan een kleine proxy zodat je
> API-key niet in de browser zichtbaar is.

## Op je telefoon gebruiken
De camera vereist HTTPS. Twee opties:
1. **Gratis deployen** (aanrader): host de statische build op Vercel of Netlify.
   ```bash
   npm run build      # output in dist/
   ```
   - Netlify: sleep de `dist/`-map naar app.netlify.com/drop, of koppel de repo.
   - Vercel: `vercel` (build command `npm run build`, output `dist`).
   Je **boekdata blijft lokaal** in de browser van je telefoon — alleen de
   app-code staat online.
2. Open op je telefoon de gedeployede URL en kies **"Zet op beginscherm"** om de
   app te installeren.

## Bouwen
```bash
npm run build      # productie-build in dist/
npm run preview    # test de productie-build lokaal
```
