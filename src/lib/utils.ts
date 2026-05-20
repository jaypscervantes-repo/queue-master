import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns';
import type { Rank, MatchCategory, Player } from '@/types';
import { RANK_VALUES, CATEGORY_LABELS } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

export function getTeamStrength(players: { rank: Rank }[]): number {
  return players.reduce((sum, p) => sum + getRankValue(p.rank), 0);
}

export function formatWaitTime(startTime: string | Date | null): string {
  if (!startTime) return '—';
  return formatDistanceToNow(new Date(startTime), { addSuffix: false });
}

export function getWaitMinutes(startTime: string | Date | null): number {
  if (!startTime) return 0;
  return differenceInMinutes(new Date(), new Date(startTime));
}

export function formatMatchTime(startTime: string | Date): string {
  return format(new Date(startTime), 'HH:mm');
}

export function formatMatchDuration(start: string | Date, end?: string | Date | null): string {
  if (!end) return `${differenceInMinutes(new Date(), new Date(start))} min`;
  return `${differenceInMinutes(new Date(end), new Date(start))} min`;
}

export function getCategoryLabel(cat: MatchCategory): string {
  return CATEGORY_LABELS[cat];
}

export function parseCategories(raw: unknown): MatchCategory[] {
  if (Array.isArray(raw)) return raw as MatchCategory[];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as MatchCategory[]; } catch { return []; }
  }
  return [];
}

export function getPlayersByTeam(players: { playerId: string; team: number; player?: Player }[], team: number): Player[] {
  return players
    .filter(mp => mp.team === team && mp.player)
    .map(mp => mp.player as Player);
}

export function sortPlayersByWait(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const aWait = a.waitingStartTime ? new Date(a.waitingStartTime).getTime() : Infinity;
    const bWait = b.waitingStartTime ? new Date(b.waitingStartTime).getTime() : Infinity;
    return aWait - bWait;
  });
}

export function generateQueuePosition(existingCount: number): number {
  return existingCount + 1;
}
