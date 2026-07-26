import Anthropic from '@anthropic-ai/sdk';

const KEY_STORAGE = 'anthropic_api_key';
// Nieuwste, meest capabele model. Je org-key heeft ruime limieten.
// Wil je goedkoper/sneller? Zet dit op 'claude-haiku-4-5'.
const MODEL = 'claude-opus-4-8';

export function getApiKey(): string | null {
  return localStorage.getItem(KEY_STORAGE);
}

export function setApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(KEY_STORAGE, trimmed);
  else localStorage.removeItem(KEY_STORAGE);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

// Maakt een client die vanuit de browser mag praten met de Claude API.
// De key blijft lokaal; 'dangerouslyAllowBrowser' is nodig omdat we geen
// server ertussen hebben (prima voor lokaal/persoonlijk gebruik).
function client(): Anthropic {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Geen Claude API-key ingesteld.');
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

// Haalt de tekst uit het eerste text-block van een antwoord.
function textOf(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('Geen tekst in antwoord.');
  return block.text.trim();
}

// Kleine testcall om te controleren of de key werkt.
export async function testApiKey(): Promise<{ ok: boolean; message: string }> {
  try {
    const msg = await client().messages.create({
      model: MODEL,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Antwoord met alleen het woord: OK' }],
    });
    return { ok: true, message: `Key werkt ✓ (antwoord: "${textOf(msg).slice(0, 20)}")` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Onbekende fout' };
  }
}

function extractJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

export interface IdentifiedBook {
  title: string;
  authors?: string[];
  summary?: string;
  categories: string[];
}

// Voert een prompt uit met web search aan; handelt de server-side tool-lus af
// (pause_turn) en geeft de tekst van het eindantwoord terug.
async function runWebSearch(prompt: string, maxTokens: number): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }];
  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4 }];

  let final: Anthropic.Message | null = null;
  for (let i = 0; i < 4; i++) {
    const msg = await client().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      messages,
      tools: tools as Anthropic.ToolUnion[],
    });
    if (msg.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: msg.content });
      continue;
    }
    final = msg;
    break;
  }
  if (!final) return '';
  return final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

// Laatste redmiddel: laat Claude mét web search opzoeken welk boek bij een ISBN
// hoort (voor boeken die Google Books en Open Library niet kennen — vaak
// Nederlandse titels). Geeft alleen iets terug als Claude het kan verifiëren.
export async function identifyBookByIsbn(isbn: string): Promise<IdentifiedBook | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  const prompt = `Zoek met web search welk boek hoort bij ISBN ${clean}. Controleer titel en auteur op meerdere bronnen.
Geef UITSLUITEND geldige JSON terug, geen andere tekst.
- Als je het boek betrouwbaar kunt vaststellen:
  {"found": true, "title": "…", "authors": ["…"], "summary": "een uitgebreide Nederlandse samenvatting van 4-7 zinnen", "categories": ["2 tot 4 korte Nederlandse categorieën"]}
- Kun je het niet met zekerheid vaststellen: {"found": false}
Alles in het Nederlands.`;

  const text = await runWebSearch(prompt, 1500);
  if (!text) return null;

  const json = extractJson(text);
  if (!json) return null;
  let parsed: { found?: boolean; title?: string; authors?: string[]; summary?: string; categories?: string[] };
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed.found || !parsed.title) return null;
  return {
    title: parsed.title,
    authors: parsed.authors,
    summary: parsed.summary?.trim() || undefined,
    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
  };
}

// Zoekt met web search naar directe omslag-afbeeldings-URL's voor een boek.
// Geeft een lijst kandidaat-URL's terug; kapotte laadt de UI vanzelf weg.
export async function findCoverImageUrls(book: {
  isbn?: string;
  title: string;
  authors?: string[];
}): Promise<string[]> {
  const author = book.authors?.[0];
  const prompt = `Zoek met web search naar omslagafbeeldingen (cover) van dit exacte boek:
Titel: "${book.title}"${author ? `\nAuteur: ${author}` : ''}${book.isbn ? `\nISBN: ${book.isbn}` : ''}.
Geef UITSLUITEND een JSON-array van directe afbeeldings-URL's die het juiste boek tonen. Voorwaarden:
- Alleen URL's die je echt via zoeken hebt gevonden (geen verzonnen links).
- Directe afbeeldingen: eindigend op .jpg/.jpeg/.png, of van books.google.com of covers.openlibrary.org.
- Maximaal 6, geen dubbele. Geen andere tekst.
Voorbeeld: ["https://…/cover.jpg", "https://…/omslag.png"]`;

  const text = await runWebSearch(prompt, 1024);
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    return Array.isArray(arr) ? arr.filter((u): u is string => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

export interface DutchNormalization {
  summary?: string;
  categories: string[];
}

const NL_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    categories: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'categories'],
  additionalProperties: false,
} as const;

// Zet titel/auteur/(bestaande) samenvatting + categorieën om naar nette Nederlandse
// tekst. Genereert altijd een uitgebreide samenvatting (4-7 zinnen).
export async function normalizeToDutch(input: {
  title: string;
  authors?: string[];
  summary?: string;
  categories: string[];
}): Promise<DutchNormalization> {
  const prompt = `Je bent een bibliotheek-assistent. Alles wat je teruggeeft moet VOLLEDIG in het Nederlands zijn — geen Engelse of Duitse woorden.
Boek: "${input.title}"${input.authors?.length ? ` van ${input.authors.join(', ')}` : ''}.
Bestaande samenvatting (kan leeg, kort of anderstalig zijn, gebruik als bron): "${input.summary ?? ''}".
Bestaande categorieën: ${JSON.stringify(input.categories)}.

Taken:
1. "summary": schrijf ALTIJD een uitgebreide, samenhangende Nederlandse samenvatting van MINIMAAL 4 en maximaal 7 zinnen (één volledige alinea). Gebruik de bestaande samenvatting én je eigen kennis van het boek; breid altijd uit tot een volwaardige alinea, geef nooit slechts één of twee zinnen.
2. "categories": 2 tot 4 korte, nette Nederlandse categorieën (bijv. "Psychologie", "Non-fictie", "Geschiedenis"). Vertaal/normaliseer volledig naar het Nederlands; verwijder dubbele en te specifieke termen.`;

  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: NL_SCHEMA } },
  });

  const parsed = JSON.parse(textOf(msg)) as DutchNormalization;
  return {
    summary: parsed.summary?.trim() || undefined,
    categories: Array.isArray(parsed.categories) ? parsed.categories : input.categories,
  };
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function toMediaType(mime: string): ImageMediaType {
  if (mime === 'image/png' || mime === 'image/gif' || mime === 'image/webp') return mime;
  return 'image/jpeg';
}

// Vat een boek samen in het Nederlands op basis van een foto (bijv. de achterkant).
export async function summarizeFromPhoto(
  base64: string,
  mimeType: string,
  context: { title?: string; authors?: string[] },
): Promise<string> {
  const hint = context.title
    ? `Het gaat vermoedelijk om "${context.title}"${context.authors?.length ? ` van ${context.authors.join(', ')}` : ''}. `
    : '';
  const prompt = `${hint}Dit is een foto van (de achterkant van) een boek. Geef een uitgebreide, samenhangende Nederlandse samenvatting van MINIMAAL 4 en maximaal 7 zinnen (één volledige alinea) op basis van wat je ziet en je kennis van het boek. Alles volledig in het Nederlands. Geef alleen de samenvatting, geen inleiding.`;

  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image',
            source: { type: 'base64', media_type: toMediaType(mimeType), data: base64 },
          },
        ],
      },
    ],
  });

  return textOf(msg);
}
