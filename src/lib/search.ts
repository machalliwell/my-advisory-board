import { SearchIndex, WisdomChunk, SearchResult, GroupedResults } from './types';
import { getExpertTier } from './game';

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
      // Text matches (count occurrences)
      const textMatches = (textLower.match(new RegExp(token, 'g')) || []).length;
      score += textMatches * 2;

      // Guest name match (high value)
      if (guestLower.includes(token)) score += 10;

      // Title match
      if (titleLower.includes(token)) score += 5;

      // Keywords match
      if (keywordsJoined.includes(token)) score += 3;
    }

    // Exact phrase match bonus
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
    tier: getExpertTier(guest),
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

export function formatLinkedInPost(results: SearchResult[], query: string): string {
  const topResults = results.slice(0, 4);
  let post = `I asked ${topResults.length} product leaders: "${query}"\n\nHere's what they said 👇\n\n`;

  for (let i = 0; i < topResults.length; i++) {
    const { chunk } = topResults[i];
    const quote = trimQuote(chunk.text, 60);
    post += `${i + 1}. ${chunk.guest}:\n"${quote}"\n\n`;
  }

  post += `---\n\n`;
  post += `These insights come from real conversations on Lenny's Podcast.\n`;
  post += `Built with PM Advisory Board — a free tool to search 312+ expert interviews.\n\n`;
  post += `♻️ Repost if this was helpful\n💬 Which advice resonates most with you?`;

  return post;
}
