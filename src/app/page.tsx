'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SearchIndex,
  SearchResult,
  GroupedResults,
  AppMode,
  Achievement,
  GameState,
} from '@/lib/types';
import {
  loadSearchIndex,
  searchChunks,
  groupResultsByGuest,
  getTopicEpisodes,
  trimQuote,
  formatLinkedInPost,
} from '@/lib/search';
import {
  createInitialGameState,
  processSearch,
  processLinkedInPost,
  getLevelInfo,
  getAllExperts,
  getExpertTier,
  getTierColor,
  getTierBg,
} from '@/lib/game';
import Header from '@/components/Header';
import SearchInput from '@/components/SearchInput';
import QuoteCard from '@/components/QuoteCard';
import ExpertGrid from '@/components/ExpertGrid';
import TopicPills from '@/components/TopicPills';
import StatsModal from '@/components/StatsModal';
import AchievementToast from '@/components/AchievementToast';
import LinkedInPreview from '@/components/LinkedInPreview';

const SUGGESTED_QUESTIONS = [
  'How do I prioritize my roadmap?',
  'What makes a great PM?',
  'How to get product market fit?',
  'How should I run user research?',
  'What metrics should I track?',
  'How to manage stakeholders?',
  'When should you ship an MVP?',
  'How to build a growth team?',
];

export default function Home() {
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AppMode>('advisor');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [grouped, setGrouped] = useState<GroupedResults[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [showStats, setShowStats] = useState(false);
  const [toasts, setToasts] = useState<Achievement[]>([]);
  const [linkedInPost, setLinkedInPost] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeQuery, setActiveQuery] = useState('');

  useEffect(() => {
    loadSearchIndex().then(idx => {
      setIndex(idx);
      setLoading(false);
    });
  }, []);

  const showToast = useCallback((achievements: Achievement[]) => {
    if (achievements.length === 0) return;
    setToasts(prev => [...prev, ...achievements]);
    setTimeout(() => {
      setToasts(prev => prev.slice(achievements.length));
    }, 3000);
  }, []);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (!index || !searchQuery.trim()) return;

      const searchResults = searchChunks(index, searchQuery);
      setResults(searchResults);
      setGrouped(groupResultsByGuest(searchResults));
      setHasSearched(true);
      setActiveQuery(searchQuery);
      setLinkedInPost('');
      setCopied(false);

      // Process game state
      const update = processSearch(gameState, searchResults);
      setGameState(update.newState);
      showToast(update.newAchievements);
    },
    [index, gameState, showToast]
  );

  const handleTopicClick = useCallback(
    (topic: string) => {
      if (!index) return;
      const topicResults = getTopicEpisodes(index, topic);
      setResults(topicResults);
      setGrouped(groupResultsByGuest(topicResults));
      setHasSearched(true);
      setActiveQuery(topic);
      setQuery(topic);
      setLinkedInPost('');
      setCopied(false);

      const update = processSearch(gameState, topicResults);
      setGameState(update.newState);
      showToast(update.newAchievements);
    },
    [index, gameState, showToast]
  );

  const handleLinkedInGenerate = useCallback(() => {
    const post = formatLinkedInPost(results, activeQuery);
    setLinkedInPost(post);

    const update = processLinkedInPost(gameState, mode === 'advisor');
    setGameState(update.newState);
    showToast(update.newAchievements);
  }, [results, activeQuery, gameState, mode, showToast]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(linkedInPost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = linkedInPost;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [linkedInPost]);

  const handleNewQuestion = useCallback(() => {
    setQuery('');
    setResults([]);
    setGrouped([]);
    setHasSearched(false);
    setLinkedInPost('');
    setActiveQuery('');
  }, []);

  const levelInfo = getLevelInfo(gameState.xp);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎙️</div>
          <p className="text-gray-400">Loading wisdom from 312 product leaders...</p>
        </div>
      </div>
    );
  }

  const topTopics = index ? Object.keys(index.topics).slice(0, 20) : [];

  return (
    <div className="min-h-screen">
      {/* Achievement Toasts */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center">
        {toasts.map((achievement, i) => (
          <AchievementToast key={achievement.id + i} achievement={achievement} />
        ))}
      </div>

      {/* Stats Modal */}
      {showStats && (
        <StatsModal
          gameState={gameState}
          levelInfo={levelInfo}
          onClose={() => setShowStats(false)}
        />
      )}

      {/* Header */}
      <Header
        mode={mode}
        onModeChange={setMode}
        gameState={gameState}
        levelInfo={levelInfo}
        onStatsClick={() => setShowStats(true)}
      />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pb-20">
        {!hasSearched ? (
          /* Home State */
          <div className="pt-8">
            <h1 className="font-serif text-3xl md:text-4xl text-center mb-2">
              {mode === 'advisor'
                ? 'Ask 312 product leaders anything'
                : 'Draft your next viral LinkedIn post'}
            </h1>
            <p className="text-gray-400 text-center mb-8 text-sm">
              Real quotes from real podcast interviews. Zero AI. 100% free.
            </p>

            <SearchInput
              query={query}
              onQueryChange={setQuery}
              onSearch={handleSearch}
              mode={mode}
            />

            {/* Suggested Questions */}
            <div className="grid grid-cols-2 gap-2 mt-6">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => {
                    setQuery(q);
                    handleSearch(q);
                  }}
                  className="text-left text-sm px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 transition-colors truncate"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Expert Collection */}
            <div className="mt-10">
              <h2 className="font-serif text-xl mb-4">Expert Collection</h2>
              <ExpertGrid collectedExperts={gameState.collectedExperts} />
            </div>

            {/* Topics */}
            <div className="mt-10">
              <h2 className="font-serif text-xl mb-4">Browse by Topic</h2>
              <TopicPills topics={topTopics} onTopicClick={handleTopicClick} />
            </div>
          </div>
        ) : (
          /* Results State */
          <div className="pt-6">
            <SearchInput
              query={query}
              onQueryChange={setQuery}
              onSearch={handleSearch}
              mode={mode}
            />

            {/* Mode badge + result count */}
            <div className="flex items-center gap-2 mt-4 mb-4">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  mode === 'advisor'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-orange-500/20 text-orange-300'
                }`}
              >
                {mode === 'advisor' ? '🧠 Advisor' : '✍️ LinkedIn'}
              </span>
              <span className="text-gray-500 text-sm">
                {results.length} quotes from {grouped.length} experts
              </span>
            </div>

            {/* Board members consulted */}
            <div className="flex flex-wrap gap-2 mb-4">
              {grouped.map(g => (
                <span
                  key={g.guest}
                  className={`text-xs px-2 py-1 rounded-full border ${getTierBg(g.tier)}`}
                >
                  {g.guest}
                </span>
              ))}
            </div>

            {/* Quote Cards */}
            {mode === 'advisor' || !linkedInPost ? (
              <div className="space-y-4">
                {grouped.map(group => (
                  <div key={group.guest}>
                    {group.results.map((result, i) => (
                      <QuoteCard
                        key={`${result.chunk.episodeId}-${i}`}
                        result={result}
                        tier={group.tier}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : null}

            {/* LinkedIn Preview */}
            {linkedInPost && (
              <LinkedInPreview
                post={linkedInPost}
                copied={copied}
                onCopy={handleCopy}
              />
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              {!linkedInPost && results.length > 0 && (
                <button
                  onClick={handleLinkedInGenerate}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  ✍️ Turn into LinkedIn post (+20 XP)
                </button>
              )}
              <button
                onClick={handleNewQuestion}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
              >
                Ask another question
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
