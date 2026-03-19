'use client';

interface HeaderProps {
  onReset?: () => void;
  hasSearched: boolean;
}

export default function Header({ onReset, hasSearched }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Title */}
          <button
            onClick={onReset}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-lg">
              🎙️
            </div>
            <span className="font-serif text-lg font-bold hidden sm:inline">
              PM Advisory Board
            </span>
          </button>

          {/* Reset button when in results */}
          {hasSearched && (
            <button
              onClick={onReset}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              New Question
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
