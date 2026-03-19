'use client';

import { AppMode } from '@/lib/types';

interface SearchInputProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (q: string) => void;
  mode: AppMode;
}

export default function SearchInput({
  query,
  onQueryChange,
  onSearch,
  mode,
}: SearchInputProps) {
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSearch(query);
      }}
      className="relative"
    >
      <input
        type="text"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        placeholder={
          mode === 'advisor'
            ? 'Ask your advisory board a question...'
            : 'What topic should your LinkedIn post cover?'
        }
        className="w-full px-4 py-3 pl-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none search-glow transition-shadow text-sm"
        autoFocus
      />
      <svg
        className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <button
        type="submit"
        className="absolute right-2 top-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Search
      </button>
    </form>
  );
}
