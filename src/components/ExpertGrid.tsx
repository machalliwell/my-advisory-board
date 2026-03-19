'use client';

import { getAllExperts, getTierColor, getTierBg } from '@/lib/game';

interface ExpertGridProps {
  collectedExperts: Set<string>;
}

export default function ExpertGrid({ collectedExperts }: ExpertGridProps) {
  const experts = getAllExperts();
  const collected = collectedExperts.size;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        {collected}/19 collected
      </p>
      <div className="grid grid-cols-2 gap-2">
        {experts.map(expert => {
          const isCollected = collectedExperts.has(expert.name);
          return (
            <div
              key={expert.name}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-opacity ${
                isCollected
                  ? getTierBg(expert.tier)
                  : 'bg-white/[0.02] border-white/5 opacity-40'
              }`}
            >
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wider ${
                  isCollected
                    ? `${getTierBg(expert.tier)} ${getTierColor(expert.tier)}`
                    : 'bg-gray-800 border-gray-700 text-gray-600'
                }`}
              >
                {expert.tier === 'Legendary' ? '★' : expert.tier === 'Epic' ? '◆' : '●'}
              </span>
              <span
                className={`text-sm ${
                  isCollected ? 'text-white' : 'text-gray-600'
                }`}
              >
                {expert.name}
              </span>
              {isCollected && <span className="ml-auto text-green-400 text-xs">✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
