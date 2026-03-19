import { SearchIndex, SearchResult, GroupedResults } from './types';

let cachedIndex: SearchIndex | null = null;

export async function loadSearchIndex(): Promise<SearchIndex> {
  if (cachedIndex) return cachedIndex;
  const res = await fetch('/search-index.json');
  cachedIndex = await res.json();
  return cachedIndex!;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
}

export function searchChunks(
  index: SearchIndex,
  query: string,
  maxResults: number = 8
): SearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored: SearchResult[] = [];

  for (const chunk of index.chunks) {
    let score = 0;
    const textLower = chunk.text.toLowerCase();
    const guestLower = chunk.guest.toLowerCase();
    const titleLower = chunk.title.toLowerCase();
    const keywordsJoined = chunk.keywords.join(' ').toLowerCase();

    for (const token of queryTokens) {
      const textMatches = (textLower.match(new RegExp(token, 'g')) || []).length;
      score += textMatches * 2;
      if (guestLower.includes(token)) score += 10;
      if (titleLower.includes(token)) score += 5;
      if (keywordsJoined.includes(token)) score += 3;
    }

    const queryLower = query.toLowerCase();
    if (textLower.includes(queryLower)) score += 15;

    if (score > 0) {
      scored.push({ chunk, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}

export function groupResultsByGuest(results: SearchResult[]): GroupedResults[] {
  const groups = new Map<string, SearchResult[]>();

  for (const result of results) {
    const guest = result.chunk.guest;
    if (!groups.has(guest)) {
      groups.set(guest, []);
    }
    groups.get(guest)!.push(result);
  }

  return Array.from(groups.entries()).map(([guest, results]) => ({
    guest,
    results,
  }));
}

export function getTopicEpisodes(
  index: SearchIndex,
  topicName: string
): SearchResult[] {
  const slugs = index.topics[topicName];
  if (!slugs) return [];

  const results: SearchResult[] = [];
  for (const chunk of index.chunks) {
    if (slugs.includes(chunk.episodeId)) {
      results.push({ chunk, score: 1 });
    }
  }
  return results.slice(0, 8);
}

export function trimQuote(text: string, maxWords: number = 200): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

/** Get all unique guests from the search index with their topic associations */
export function getAllGuests(index: SearchIndex): { guest: string; topics: string[] }[] {
  // Build episode-to-topics reverse map
  const episodeTopics: Record<string, string[]> = {};
  for (const [topic, slugs] of Object.entries(index.topics)) {
    for (const slug of slugs) {
      if (!episodeTopics[slug]) episodeTopics[slug] = [];
      episodeTopics[slug].push(topic);
    }
  }

  // Build guest list from episodes
  const guestMap = new Map<string, Set<string>>();
  for (const ep of index.episodes) {
    if (!guestMap.has(ep.guest)) {
      guestMap.set(ep.guest, new Set());
    }
    const topics = episodeTopics[ep.id] || [];
    for (const t of topics) {
      guestMap.get(ep.guest)!.add(t);
    }
  }

  return Array.from(guestMap.entries())
    .map(([guest, topicSet]) => ({
      guest,
      topics: Array.from(topicSet),
    }))
    .sort((a, b) => a.guest.localeCompare(b.guest));
}

/** Get unique topic categories available in the index */
export function getTopicCategories(index: SearchIndex): string[] {
  return Object.keys(index.topics).sort();
}
