'use client';

import { GameState } from '@/lib/types';
import { getLevelInfo } from '@/lib/game';

interface StatsModalProps {
  gameState: GameState;
  levelInfo: ReturnType<typeof getLevelInfo>;
  onClose: () => void;
}

export default function StatsModal({ gameState, levelInfo, onClose }: StatsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Level Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">{gameState.levelEmoji}</div>
          <h2 className="font-serif text-2xl">{gameState.levelTitle}</h2>
          <p className="text-gray-400 text-sm mt-1">Level {gameState.level}</p>

          {/* XP Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{gameState.xp} XP</span>
              <span>
                {levelInfo.next ? `${levelInfo.next.xp} XP` : 'MAX'}
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full">
              <div
                className="h-full rounded-full xp-bar transition-all duration-500"
                style={{
                  width: `${Math.min(levelInfo.progress * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">{gameState.searchCount}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              Questions
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">
              {gameState.collectedExperts.size}
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              Experts
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">
              {gameState.streak > 0 ? `🔥 ${gameState.streak}` : '0'}
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              Streak
            </div>
          </div>
        </div>

        {/* Achievements */}
        <h3 className="font-serif text-lg mb-3">Achievements</h3>
        <div className="grid grid-cols-2 gap-2">
          {gameState.achievements.map(achievement => (
            <div
              key={achievement.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-opacity ${
                achievement.unlocked
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white/[0.02] border-white/5 opacity-40'
              }`}
            >
              <span className="text-lg">{achievement.emoji}</span>
              <div className="min-w-0">
                <div
                  className={`text-xs font-medium truncate ${
                    achievement.unlocked ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {achievement.name}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {achievement.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full mt-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
