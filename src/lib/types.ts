export interface Episode {
  id: string;
  guest: string;
  title: string;
  youtubeUrl: string;
  publishDate: string;
  keywords: string[];
  description?: string;
  wordCount?: number;
}

export interface WisdomChunk {
  episodeId: string;
  guest: string;
  title: string;
  youtubeUrl: string;
  keywords: string[];
  text: string;
}

export interface SearchIndex {
  buildDate: string;
  episodeCount: number;
  chunkCount: number;
  topicCount: number;
  episodes: Episode[];
  topics: Record<string, string[]>;
  chunks: WisdomChunk[];
}

export interface SearchResult {
  chunk: WisdomChunk;
  score: number;
}

export interface GroupedResults {
  guest: string;
  results: SearchResult[];
}

export type ContentStyle =
  | 'storytelling'
  | 'contrarian'
  | 'listicle'
  | 'reflection'
  | 'data-driven'
  | 'conversational';

export type ContentFormat = 'linkedin' | 'blog';
