import type { Rank, MatchCategory } from '@/types';

export const RANK_VALUES: Record<Rank, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
};

export const RANK_COLORS: Record<Rank, string> = {
  A: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  B: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  C: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  D: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  E: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

export const CATEGORY_LABELS: Record<MatchCategory, string> = {
  MensDoubles: "Men's Doubles",
  WomensDoubles: "Women's Doubles",
  MixedDoubles: 'Mixed Doubles',
};

export const CATEGORY_ICONS: Record<MatchCategory, string> = {
  MensDoubles: '♂',
  WomensDoubles: '♀',
  MixedDoubles: '⚡',
};

export const STATUS_COLORS: Record<string, string> = {
  Queued: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  Playing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Offline: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  Paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Available: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  Occupied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Maintenance: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export const MATCHMAKING_WEIGHTS = {
  TEAM_DIFF: 3,
  REPEAT_PARTNER: 5,
  REPEAT_OPPONENT: 2,
  WAITING_BONUS_PER_MIN: 0.2,
  GAMES_PLAYED: 0.3,
};

export const RECENT_MATCH_LOOKBACK = 3;
