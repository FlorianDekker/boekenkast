import { fetchBookByIsbn, type LookupResult } from './googleBooks';
import { fetchBookByIsbnOpenLibrary, fetchByIsbnOpenLibrarySearch } from './openLibrary';
import { fetchWikipediaSummary } from './wikipedia';
import { translateCategoriesLocal } from '../i18n/categories';
import { hasApiKey, normalizeToDutch, identifyBookByIsbn } from './claude';

// Zoek een boek op ISBN en lever alles zoveel mogelijk in het Nederlands:
// 1. Google Books (rijkste data), bij fout/limiet (429) → 2. Open Library.
// 3. Categorieën lokaal naar NL vertalen (woordenboek).
// 4. Ontbreekt de samenvatting? Vul aan via Nederlandstalige Wikipedia.
// 5. Is er een Claude API-key? Laat die de samenvatting + categorieën netjes
//    naar het Nederlands normaliseren (beste kwaliteit).
export async function lookupBook(isbn: string): Promise<LookupResult | null> {
  let result: LookupResult | null = null;

  try {
    result = await fetchBookByIsbn(isbn);
  } catch (err) {
    console.warn('Google Books mislukt, val terug op Open Library:', err);
  }
  if (!result) {
    try {
      result = await fetchBookByIsbnOpenLibrary(isbn);
    } catch (err) {
      console.warn('Open Library (data) mislukt:', err);
    }
  }
  if (!result) {
    try {
      result = await fetchByIsbnOpenLibrarySearch(isbn);
    } catch (err) {
      console.warn('Open Library (zoek) mislukt:', err);
    }
  }
  // Laatste redmiddel: Claude met web search (alleen als er een key is).
  if (!result && hasApiKey()) {
    try {
      const ai = await identifyBookByIsbn(isbn);
      if (ai) {
        result = {
          isbn: isbn.replace(/[^0-9Xx]/g, ''),
          title: ai.title,
          authors: ai.authors,
          coverUrl: undefined,
          summary: ai.summary,
          summarySource: 'ai',
          categories: ai.categories,
        };
      }
    } catch (err) {
      console.warn('Claude-identificatie mislukt:', err);
    }
  }
  if (!result) return null;

  // Categorieën alvast lokaal naar Nederlands.
  result = { ...result, categories: translateCategoriesLocal(result.categories) };
  // (De cover wordt in de Cover-component afgehandeld: is er geen echte cover,
  //  dan probeert die Google's cover-by-ISBN en anders de gekleurde rug.)

  // Samenvatting aanvullen via Wikipedia (NL eerst) als die ontbreekt.
  if (!result.summary) {
    try {
      const wiki = await fetchWikipediaSummary(result.title, result.authors?.[0]);
      if (wiki) {
        result = { ...result, summary: wiki.summary, summarySource: 'wikipedia' };
      }
    } catch (err) {
      console.warn('Wikipedia-samenvatting mislukt:', err);
    }
  }

  // Premium: laat Claude alles netjes in het Nederlands zetten (indien key).
  // Sla over als het resultaat al van Claude zelf komt (voorkomt dubbele call).
  if (hasApiKey() && result.summarySource !== 'ai') {
    try {
      const nl = await normalizeToDutch({
        title: result.title,
        authors: result.authors,
        summary: result.summary,
        categories: result.categories,
      });
      result = {
        ...result,
        summary: nl.summary ?? result.summary,
        summarySource: nl.summary ? 'ai' : result.summarySource,
        categories: nl.categories.length ? nl.categories : result.categories,
      };
    } catch (err) {
      console.warn('Claude-normalisatie mislukt, houd huidige data:', err);
    }
  }

  return result;
}

export type { LookupResult };
