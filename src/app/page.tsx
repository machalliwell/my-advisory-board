'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SearchIndex,
  SearchResult,
  GroupedResults,
  ContentStyle,
  ContentFormat,
} from '@/lib/types';
import {
  loadSearchIndex,
  searchChunks,
  groupResultsByGuest,
  getTopicEpisodes,
  trimQuote,
  getAllGuests,
  getTopicCategories,
} from '@/lib/search';
import Header from '@/components/Header';
import SearchInput from '@/components/SearchInput';
import QuoteCard from '@/components/QuoteCard';
import ExpertDirectory from '@/components/ExpertDirectory';
import TopicPills from '@/components/TopicPills';
import SynthesizedAnswer from '@/components/SynthesizedAnswer';
import ContentStylePicker from '@/components/ContentStylePicker';
import ContentPreview from '@/components/ContentPreview';

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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [grouped, setGrouped] = useState<GroupedResults[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeQuery, setActiveQuery] = useState('');
  const [synthesizedText, setSynthesizedText] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);

  // Content generation state
  const [generatedContent, setGeneratedContent] = useState('');
  const [contentFormat, setContentFormat] = useState<ContentFormat>('linkedin');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSearchIndex().then(idx => {
      setIndex(idx);
      setLoading(false);
    });
  }, []);

  const guests = useMemo(() => (index ? getAllGuests(index) : []), [index]);
  const categories = useMemo(() => (index ? getTopicCategories(index) : []), [index]);

  const synthesize = useCallback(
    async (searchQuery: string, searchResults: SearchResult[]) => {
      setSynthesizedText('');
      setSynthesisError(null);
      setIsSynthesizing(true);

      try {
        const chunks = searchResults.slice(0, 6).map(r => ({
          guest: r.chunk.guest,
          title: r.chunk.title,
          text: trimQuote(r.chunk.text, 300),
        }));

        const res = await fetch('/api/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, chunks, mode: 'advisor' }),
        });

        if (!res.ok) {
          const err = await res.json();
          setSynthesisError(err.error || 'Failed to synthesize answer');
          setIsSynthesizing(false);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setSynthesizedText(fullText);
        }
      } catch {
        setSynthesisError('Failed to connect to synthesis service. The raw quotes are still available below.');
      } finally {
        setIsSynthesizing(false);
      }
    },
    []
  );

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (!index || !searchQuery.trim()) return;

      const searchResults = searchChunks(index, searchQuery);
      setResults(searchResults);
      setGrouped(groupResultsByGuest(searchResults));
      setHasSearched(true);
      setActiveQuery(searchQuery);
      setGeneratedContent('');
      setCopied(false);

      if (searchResults.length > 0) {
        synthesize(searchQuery, searchResults);
      }
    },
    [index, synthesize]
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
      setGeneratedContent('');
      setCopied(false);

      if (topicResults.length > 0) {
        synthesize(`What do Lenny's guests recommend about ${topic}?`, topicResults);
      }
    },
    [index, synthesize]
  );

  const handleGuestClick = useCallback(
    (guestName: string) => {
      setQuery(guestName);
      handleSearch(guestName);
    },
    [handleSearch]
  );

  const handleReset = useCallback(() => {
    setQuery('');
    setResults([]);
    setGrouped([]);
    setHasSearched(false);
    setGeneratedContent('');
    setActiveQuery('');
    setSynthesizedText('');
    setSynthesisError(null);
    setCopied(false);
    setContentError(null);
    setIsGeneratingContent(false);
  }, []);

  const handleGenerateContent = useCallback(
    async (format: ContentFormat, style: ContentStyle) => {
      if (!synthesizedText) return;

      setGeneratedContent('');
      setContentFormat(format);
      setIsGeneratingContent(true);
      setContentError(null);
      setCopied(false);

      try {
        const res = await fetch('/api/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: format,
            style,
            synthesizedAnswer: synthesizedText,
            query: activeQuery,
          }),
        });

        if (!res.ok) {
          setContentError('Failed to generate content. Please try again.');
          setIsGeneratingContent(false);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setGeneratedContent(fullText);
        }
      } catch {
        setContentError('Failed to connect to content service. Please try again.');
      } finally {
        setIsGeneratingContent(false);
      }
    },
    [synthesizedText, activeQuery]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = generatedContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedContent]);

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
      {/* Header */}
      <Header onReset={handleReset} hasSearched={hasSearched} />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pb-20">
        {!hasSearched ? (
          /* Home State */
          <div className="pt-8">
            <h1 className="font-serif text-3xl md:text-4xl text-center mb-2">
              Ask 312 product leaders anything
            </h1>
            <p className="text-gray-400 text-center mb-8 text-sm">
              Synthesized advice from real podcast interviews. 100% free.
            </p>

            <SearchInput
              query={query}
              onQueryChange={setQuery}
              onSearch={handleSearch}
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

            {/* Expert Directory */}
            <div className="mt-10">
              <h2 className="font-serif text-xl mb-4">
                Expert Directory
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {guests.length} guests
                </span>
              </h2>
              <ExpertDirectory
                guests={guests}
                categories={categories}
                onGuestClick={handleGuestClick}
              />
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
            />

            {/* Result count + reset */}
            <div className="flex items-center justify-between mt-4 mb-4">
              <span className="text-gray-500 text-sm">
                {results.length} quotes from {grouped.length} expert{grouped.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleReset}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Reset Board
              </button>
            </div>

            {/* Board members consulted */}
            <div className="flex flex-wrap gap-2 mb-4">
              {grouped.map(g => (
                <span
                  key={g.guest}
                  className="text-xs px-2 py-1 rounded-full border bg-purple-400/10 border-purple-400/20 text-purple-300"
                >
                  {g.guest}
                </span>
              ))}
            </div>

            {/* Synthesized Answer */}
            <SynthesizedAnswer
              text={synthesizedText}
              isStreaming={isSynthesizing}
              error={synthesisError}
            />

            {/* Content Generation */}
            {synthesizedText && !isSynthesizing && (
              <ContentStylePicker
                onGenerate={handleGenerateContent}
                isGenerating={isGeneratingContent}
              />
            )}

            {/* Content generation error */}
            {contentError && (
              <div className="mt-3 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {contentError}
              </div>
            )}

            {/* Generated Content Preview */}
            {(generatedContent || isGeneratingContent) && (
              <ContentPreview
                content={generatedContent}
                format={contentFormat}
                copied={copied}
                onCopy={handleCopy}
                isStreaming={isGeneratingContent}
              />
            )}

            {/* Source Quotes */}
            <div className="space-y-4 mt-6">
              {(synthesizedText || synthesisError) && results.length > 0 && (
                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">
                  Source transcripts
                </div>
              )}
              {grouped.map(group => (
                <div key={group.guest}>
                  {group.results.map((result, i) => (
                    <QuoteCard
                      key={`${result.chunk.episodeId}-${i}`}
                      result={result}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Bottom reset */}
            <div className="flex justify-center mt-8">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
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
