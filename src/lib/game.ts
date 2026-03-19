import { ExpertTier, Expert, Achievement, GameState, SearchResult } from './types';

// Expert tiers
const EXPERTS: Expert[] = [
  // Legendary (gold)
  { name: 'Shreyas Doshi', tier: 'Legendary' },
  { name: 'Marty Cagan', tier: 'Legendary' },
  { name: 'Brian Chesky', tier: 'Legendary' },
  { name: 'Bret Taylor', tier: 'Legendary' },
  { name: 'Ben Horowitz', tier: 'Legendary' },
  { name: 'Melanie Perkins', tier: 'Legendary' },
  // Epic (purple)
  { name: 'Elena Verna', tier: 'Epic' },
  { name: 'Ami Vora', tier: 'Epic' },
  { name: 'Adam Fishman', tier: 'Epic' },
  { name: 'Casey Winters', tier: 'Epic' },
  { name: 'Camille Fournier', tier: 'Epic' },
  { name: 'Stewart Butterfield', tier: 'Epic' },
  { name: 'Nick Turley', tier: 'Epic' },
  // Rare (blue)
  { name: 'Molly Graham', tier: 'Rare' },
  { name: 'Jason Cohen', tier: 'Rare' },
  { name: 'Matt LeMay', tier: 'Rare' },
  { name: 'Madhavan Ramanujam', tier: 'Rare' },
  { name: 'Chip Huyen', tier: 'Rare' },
  { name: 'Ravi Mehta', tier: 'Rare' },
];

export function getAllExperts(): Expert[] {
  return EXPERTS;
}

export function getExpertTier(guestName: string): ExpertTier {
  const expert = EXPERTS.find(
    e => e.name.toLowerCase() === guestName.toLowerCase()
  );
  return expert?.tier || 'Common';
}

export function getTierColor(tier: ExpertTier): string {
  switch (tier) {
    case 'Legendary': return 'text-yellow-400';
    case 'Epic': return 'text-purple-400';
    case 'Rare': return 'text-blue-400';
    default: return 'text-gray-400';
  }
}

export function getTierBg(tier: ExpertTier): string {
  switch (tier) {
    case 'Legendary': return 'bg-yellow-400/20 border-yellow-400/40';
    case 'Epic': return 'bg-purple-400/20 border-purple-400/40';
    case 'Rare': return 'bg-blue-400/20 border-blue-400/40';
    default: return 'bg-gray-400/20 border-gray-400/40';
  }
}

// Levels
const LEVELS = [
  { level: 1, title: 'Associate PM', xp: 0, emoji: '🌱' },
  { level: 2, title: 'Product Manager', xp: 50, emoji: '📋' },
  { level: 3, title: 'Senior PM', xp: 150, emoji: '🎯' },
  { level: 4, title: 'Staff PM', xp: 350, emoji: '⚡' },
  { level: 5, title: 'Group PM', xp: 600, emoji: '🏗️' },
  { level: 6, title: 'Director of Product', xp: 1000, emoji: '🔥' },
  { level: 7, title: 'VP of Product', xp: 1500, emoji: '💎' },
  { level: 8, title: 'CPO', xp: 2500, emoji: '👑' },
  { level: 9, title: 'Product Legend', xp: 4000, emoji: '🏆' },
  { level: 10, title: 'Advisory Board Chair', xp: 6000, emoji: '🎙️' },
];

export function getLevelInfo(xp: number) {
  let current = LEVELS[0];
  let next = LEVELS[1];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
      break;
    }
  }

  const progress = next
    ? (xp - current.xp) / (next.xp - current.xp)
    : 1;

  return { current, next, progress };
}

// Achievements
function createAchievements(): Achievement[] {
  return [
    { id: 'first_steps', name: 'First Steps', description: 'Ask first question', emoji: '🐣', xp: 10, unlocked: false },
    { id: 'curious_mind', name: 'Curious Mind', description: 'Ask 5 questions', emoji: '🧠', xp: 25, unlocked: false },
    { id: 'deep_diver', name: 'Deep Diver', description: 'Ask 20 questions', emoji: '🤿', xp: 50, unlocked: false },
    { id: 'content_creator', name: 'Content Creator', description: 'Generate first LinkedIn post', emoji: '✍️', xp: 15, unlocked: false },
    { id: 'thought_leader', name: 'Thought Leader', description: 'Generate 5 LinkedIn posts', emoji: '📣', xp: 40, unlocked: false },
    { id: 'networking', name: 'Networking', description: 'Collect 5 experts', emoji: '🤝', xp: 20, unlocked: false },
    { id: 'inner_circle', name: 'Inner Circle', description: 'Collect 10 experts', emoji: '💫', xp: 40, unlocked: false },
    { id: 'full_rolodex', name: 'Full Rolodex', description: 'Collect all 19 experts', emoji: '🏅', xp: 100, unlocked: false },
    { id: 'legend_hunter', name: 'Legend Hunter', description: 'Get quotes from 3 Legendary experts', emoji: '⭐', xp: 50, unlocked: false },
    { id: 'on_a_roll', name: 'On a Roll', description: '3-day streak', emoji: '🔥', xp: 30, unlocked: false },
    { id: 'unstoppable', name: 'Unstoppable', description: '7-day streak', emoji: '💥', xp: 75, unlocked: false },
    { id: 'pm_machine', name: 'PM Machine', description: '30-day streak', emoji: '🤖', xp: 200, unlocked: false },
    { id: 'content_bridge', name: 'Content Bridge', description: 'Turn an advisory answer into a LinkedIn post', emoji: '🌉', xp: 20, unlocked: false },
  ];
}

export function createInitialGameState(): GameState {
  return {
    xp: 0,
    level: 1,
    levelTitle: 'Associate PM',
    levelEmoji: '🌱',
    searchCount: 0,
    linkedinPostCount: 0,
    collectedExperts: new Set<string>(),
    streak: 0,
    lastSearchDate: null,
    achievements: createAchievements(),
    bridgeUsed: false,
  };
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export interface GameUpdate {
  newState: GameState;
  xpGained: number;
  newAchievements: Achievement[];
}

export function processSearch(
  state: GameState,
  results: SearchResult[]
): GameUpdate {
  const newState = { ...state, collectedExperts: new Set(state.collectedExperts) };
  let xpGained = 0;
  const newAchievements: Achievement[] = [];

  // +10 XP per search
  xpGained += 10;
  newState.searchCount += 1;

  // Collect experts and calculate bonuses
  const uniqueGuests = new Set(results.map(r => r.chunk.guest));
  xpGained += uniqueGuests.size * 5; // +5 per unique expert

  uniqueGuests.forEach(guest => {
    newState.collectedExperts.add(guest);
    const tier = getExpertTier(guest);
    if (tier === 'Legendary') xpGained += 3;
    else if (tier === 'Epic') xpGained += 2;
    else if (tier === 'Rare') xpGained += 1;
  });

  // Streak
  const today = getTodayStr();
  if (newState.lastSearchDate) {
    const lastDate = new Date(newState.lastSearchDate);
    const todayDate = new Date(today);
    const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      newState.streak += 1;
    } else if (diffDays > 1) {
      newState.streak = 1;
    }
  } else {
    newState.streak = 1;
  }
  newState.lastSearchDate = today;

  // Check achievements
  const achievements = [...newState.achievements];

  function unlock(id: string) {
    const a = achievements.find(a => a.id === id);
    if (a && !a.unlocked) {
      a.unlocked = true;
      xpGained += a.xp;
      newAchievements.push(a);
    }
  }

  if (newState.searchCount >= 1) unlock('first_steps');
  if (newState.searchCount >= 5) unlock('curious_mind');
  if (newState.searchCount >= 20) unlock('deep_diver');

  const collectedCount = newState.collectedExperts.size;
  if (collectedCount >= 5) unlock('networking');
  if (collectedCount >= 10) unlock('inner_circle');
  if (collectedCount >= 19) unlock('full_rolodex');

  // Legend hunter
  const legendaryCollected = Array.from(newState.collectedExperts).filter(
    name => getExpertTier(name) === 'Legendary'
  ).length;
  if (legendaryCollected >= 3) unlock('legend_hunter');

  // Streak achievements
  if (newState.streak >= 3) unlock('on_a_roll');
  if (newState.streak >= 7) unlock('unstoppable');
  if (newState.streak >= 30) unlock('pm_machine');

  newState.achievements = achievements;
  newState.xp = state.xp + xpGained;

  // Update level
  const levelInfo = getLevelInfo(newState.xp);
  newState.level = levelInfo.current.level;
  newState.levelTitle = levelInfo.current.title;
  newState.levelEmoji = levelInfo.current.emoji;

  return { newState, xpGained, newAchievements };
}

export function processLinkedInPost(state: GameState, fromAdvisor: boolean): GameUpdate {
  const newState = { ...state, collectedExperts: new Set(state.collectedExperts) };
  let xpGained = 20;
  const newAchievements: Achievement[] = [];

  newState.linkedinPostCount += 1;

  const achievements = [...newState.achievements];
  function unlock(id: string) {
    const a = achievements.find(a => a.id === id);
    if (a && !a.unlocked) {
      a.unlocked = true;
      xpGained += a.xp;
      newAchievements.push(a);
    }
  }

  if (newState.linkedinPostCount >= 1) unlock('content_creator');
  if (newState.linkedinPostCount >= 5) unlock('thought_leader');
  if (fromAdvisor) {
    newState.bridgeUsed = true;
    unlock('content_bridge');
  }

  newState.achievements = achievements;
  newState.xp = state.xp + xpGained;

  const levelInfo = getLevelInfo(newState.xp);
  newState.level = levelInfo.current.level;
  newState.levelTitle = levelInfo.current.title;
  newState.levelEmoji = levelInfo.current.emoji;

  return { newState, xpGained, newAchievements };
}
