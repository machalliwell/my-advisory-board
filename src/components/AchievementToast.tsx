'use client';

import { Achievement } from '@/lib/types';

interface AchievementToastProps {
  achievement: Achievement;
}

export default function AchievementToast({ achievement }: AchievementToastProps) {
  return (
    <div className="toast-enter mt-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600/90 to-indigo-600/90 backdrop-blur-md border border-purple-400/30 shadow-lg shadow-purple-500/20 flex items-center gap-3 max-w-sm">
      <span className="text-2xl">{achievement.emoji}</span>
      <div>
        <div className="text-sm font-bold text-white">{achievement.name}</div>
        <div className="text-xs text-purple-200">
          {achievement.description} · +{achievement.xp} XP
        </div>
      </div>
    </div>
  );
}
