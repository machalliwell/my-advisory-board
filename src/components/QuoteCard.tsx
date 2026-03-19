'use client';

import { SearchResult } from '@/lib/types';
import { trimQuote } from '@/lib/search';

interface QuoteCardProps {
  result: SearchResult;
}

export default function QuoteCard({ result }: QuoteCardProps) {
  const { chunk } = result;
  const trimmedText = trimQuote(chunk.text);

  return (
    <div className="quote-card rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-serif font-bold text-white">{chunk.guest}</span>
      </div>

      {/* Quote */}
      <blockquote className="text-gray-300 text-sm leading-relaxed mb-3 border-l-2 border-purple-500/30 pl-3">
        &ldquo;{trimmedText}&rdquo;
      </blockquote>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="truncate max-w-[60%]">{chunk.title}</span>
        {chunk.youtubeUrl && (
          <a
            href={chunk.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            Watch
          </a>
        )}
      </div>
    </div>
  );
}
