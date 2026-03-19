'use client';

import { AppMode, GameState } from '@/lib/types';
import { getLevelInfo } from '@/lib/game';

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  gameState: GameState;
  levelInfo: ReturnType<typeof getLevelInfo>;
  onStatsClick: () => void;
}

export default function Header({
  mode,
  onModeChange,
  gameState,
  levelInfo,
  onStatsClick,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-lg">
              🎙️
            </div>
            <span className="font-serif text-lg font-bold hidden sm:inline">
              PM Advisory Board
            </span>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => onModeChange('advisor')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'advisor'
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              🧠 Advisor
            </button>
            <button
              onClick={() => onModeChange('linkedin')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'linkedin'
                  ? 'bg-orange-500/20 text-orange-300'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              ✍️ LinkedIn
            </button>
          </div>

          {/* Right side: streak + level */}
          <div className="flex items-center gap-3">
            {gameState.streak > 0 && (
              <span className="text-sm font-medium text-orange-400">
                🔥 {gameState.streak}
              </span>
            )}
            <button
              onClick={onStatsClick}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg transition-colors"
              title={`${gameState.levelTitle} - ${gameState.xp} XP`}
            >
              {gameState.levelEmoji}
            </button>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="h-1 bg-white/5 rounded-full -mt-px mb-0">
          <div
            className="h-full rounded-full xp-bar transition-all duration-500"
            style={{ width: `${Math.min(levelInfo.progress * 100, 100)}%` }}
          />
        </div>
      </div>
    </header>
  );
}
