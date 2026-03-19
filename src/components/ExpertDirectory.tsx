'use client';

import { useState, useMemo } from 'react';

interface GuestEntry {
  guest: string;
  topics: string[];
}

interface ExpertDirectoryProps {
  guests: GuestEntry[];
  categories: string[];
  onGuestClick: (guestName: string) => void;
}

export default function ExpertDirectory({ guests, categories, onGuestClick }: ExpertDirectoryProps) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = guests;
    if (filter !== 'All') {
      list = list.filter(g => g.topics.includes(filter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g => g.guest.toLowerCase().includes(q));
    }
    return list;
  }, [guests, filter, search]);

  // Show a curated set of popular categories for the filter pills
  const popularCategories = useMemo(() => {
    const popular = [
      'Product Management', 'Leadership', 'Growth Strategy', 'Ai',
      'Startup Growth', 'Hiring', 'Strategy', 'Design',
      'Engineering', 'Marketing', 'Career Growth', 'Entrepreneurship',
    ];
    return popular.filter(c => categories.includes(c));
  }, [categories]);

  return (
    <div>
      {/* Search within experts */}
      <div className="relative mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search experts..."
          className="w-full px-3 py-2 pl-9 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none text-sm"
        />
        <svg
          className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setFilter('All')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            filter === 'All'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          All ({guests.length})
        </button>
        {popularCategories.map(cat => {
          const count = guests.filter(g => g.topics.includes(cat)).length;
          return (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? 'All' : cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === cat
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Guest count */}
      <p className="text-xs text-gray-500 mb-3">
        {filtered.length} expert{filtered.length !== 1 ? 's' : ''}
        {filter !== 'All' && ` in ${filter}`}
      </p>

      {/* Guest grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[400px] overflow-y-auto pr-1">
        {filtered.map(entry => (
          <button
            key={entry.guest}
            onClick={() => onGuestClick(entry.guest)}
            className="text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-purple-500/10 hover:border-purple-500/20 transition-colors group"
          >
            <span className="text-sm text-gray-300 group-hover:text-purple-300 truncate block">
              {entry.guest}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm col-span-full py-4 text-center">
            No experts found.
          </p>
        )}
      </div>
    </div>
  );
}
