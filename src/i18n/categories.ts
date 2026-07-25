// Vertaalwoordenboek voor veelvoorkomende boekcategorieën (Engels/Duits → Nederlands).
// Werkt zonder API-key; Claude vult later de rest aan/schoont op.
const CATEGORY_MAP: Record<string, string> = {
  // Engels
  'fiction': 'Fictie',
  'nonfiction': 'Non-fictie',
  'non-fiction': 'Non-fictie',
  'history': 'Geschiedenis',
  'biography': 'Biografie',
  'biography & autobiography': 'Biografie',
  'autobiography': 'Autobiografie',
  'science': 'Wetenschap',
  'science fiction': 'Sciencefiction',
  'fantasy': 'Fantasy',
  'psychology': 'Psychologie',
  'philosophy': 'Filosofie',
  'business & economics': 'Economie',
  'economics': 'Economie',
  'self-help': 'Zelfhulp',
  'health & fitness': 'Gezondheid',
  'religion': 'Religie',
  'poetry': 'Poëzie',
  'drama': 'Drama',
  'thriller': 'Thriller',
  'mystery': 'Mysterie',
  'romance': 'Romantiek',
  'children': 'Kinderboeken',
  "children's": 'Kinderboeken',
  'juvenile fiction': 'Jeugd',
  'young adult fiction': 'Young adult',
  'cooking': 'Koken',
  'travel': 'Reizen',
  'art': 'Kunst',
  'music': 'Muziek',
  'politics': 'Politiek',
  'political science': 'Politiek',
  'social science': 'Sociale wetenschap',
  'medical': 'Geneeskunde',
  'nature': 'Natuur',
  'neuroscience': 'Neurowetenschappen',
  'true crime': 'True crime',
  'education': 'Onderwijs',
  'computers': 'Computers',
  'technology': 'Technologie',
  // Duits
  'neurowissenschaften': 'Neurowetenschappen',
  'geschichte': 'Geschiedenis',
  'psychologie': 'Psychologie',
  'philosophie': 'Filosofie',
  'roman': 'Roman',
  'sachbuch': 'Non-fictie',
  'wirtschaft': 'Economie',
  'medizin': 'Geneeskunde',
};

// Vertaalt een lijst categorieën lokaal naar het Nederlands (zonder key).
// Onbekende termen blijven staan (Claude kan ze later opschonen). Dubbele eruit.
export function translateCategoriesLocal(categories: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of categories) {
    const translated = CATEGORY_MAP[raw.trim().toLowerCase()] ?? raw.trim();
    const key = translated.toLowerCase();
    if (translated && !seen.has(key)) {
      seen.add(key);
      result.push(translated);
    }
  }
  return result;
}
