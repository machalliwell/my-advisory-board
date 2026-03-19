'use client';

import { useState } from 'react';
import { ContentStyle, ContentFormat } from '@/lib/types';

interface ContentStylePickerProps {
  onGenerate: (format: ContentFormat, style: ContentStyle) => void;
  isGenerating: boolean;
}

const STYLES: { id: ContentStyle; label: string; description: string }[] = [
  { id: 'storytelling', label: 'Storytelling', description: 'Narrative-driven with a personal arc' },
  { id: 'contrarian', label: 'Contrarian', description: 'Challenge conventional wisdom' },
  { id: 'listicle', label: 'Listicle', description: 'Numbered takeaways, easy to scan' },
  { id: 'reflection', label: 'Reflection', description: 'Thoughtful first-person perspective' },
  { id: 'data-driven', label: 'Data-Driven', description: 'Frameworks, metrics, and evidence' },
  { id: 'conversational', label: 'Conversational', description: 'Casual and relatable tone' },
];

export default function ContentStylePicker({ onGenerate, isGenerating }: ContentStylePickerProps) {
  const [selectedStyle, setSelectedStyle] = useState<ContentStyle>('conversational');

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 mt-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">
        Turn this into content
      </h3>

      {/* Style selection */}
      <p className="text-xs text-gray-500 mb-2">Pick a style:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {STYLES.map(style => (
          <button
            key={style.id}
            onClick={() => setSelectedStyle(style.id)}
            className={`text-left px-3 py-2 rounded-lg border transition-colors ${
              selectedStyle === style.id
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                : 'border-white/10 bg-white/[0.02] hover:bg-white/5 text-gray-300'
            }`}
          >
            <div className="text-xs font-medium">{style.label}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{style.description}</div>
          </button>
        ))}
      </div>

      {/* Generate buttons */}
      <div className="flex gap-3">
        <button
          disabled={isGenerating}
          onClick={() => onGenerate('linkedin', selectedStyle)}
          className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate LinkedIn Post
        </button>
        <button
          disabled={isGenerating}
          onClick={() => onGenerate('blog', selectedStyle)}
          className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Blog Post
        </button>
      </div>
      {isGenerating && (
        <p className="text-xs text-gray-500 animate-pulse mt-3 text-center">Generating content...</p>
      )}
    </div>
  );
}
