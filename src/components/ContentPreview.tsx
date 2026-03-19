'use client';

import { ContentFormat } from '@/lib/types';

interface ContentPreviewProps {
  content: string;
  format: ContentFormat;
  copied: boolean;
  onCopy: () => void;
  isStreaming: boolean;
}

export default function ContentPreview({ content, format, copied, onCopy, isStreaming }: ContentPreviewProps) {
  const isLinkedIn = format === 'linkedin';
  const borderColor = isLinkedIn ? 'border-orange-500/20' : 'border-blue-500/20';
  const labelColor = isLinkedIn ? 'text-orange-400' : 'text-blue-400';
  const label = isLinkedIn ? 'LinkedIn Post' : 'Blog Post';
  const copyBtnBase = isLinkedIn ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30' : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30';

  return (
    <div className={`rounded-xl bg-white/[0.03] border ${borderColor} p-4 mt-4`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium ${labelColor} uppercase tracking-wider`}>
          {label} Preview
        </span>
        <button
          onClick={onCopy}
          disabled={isStreaming}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            copied
              ? 'bg-green-500/20 text-green-400'
              : copyBtnBase
          } disabled:opacity-50`}
        >
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
      </div>
      <div className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
        {content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  );
}
