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
  tier: ExpertTier;
  results: SearchResult[];
}

export type ExpertTier = 'Legendary' | 'Epic' | 'Rare' | 'Common';

export interface Expert {
  name: string;
  tier: ExpertTier;
}

export type AppMode = 'advisor' | 'linkedin';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  xp: number;
  unlocked: boolean;
}

export interface GameState {
  xp: number;
  level: number;
  levelTitle: string;
  levelEmoji: string;
  searchCount: number;
  linkedinPostCount: number;
  collectedExperts: Set<string>;
  streak: number;
  lastSearchDate: string | null;
  achievements: Achievement[];
  bridgeUsed: boolean;
}
