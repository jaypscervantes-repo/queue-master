'use client';

import { useState } from 'react';
import { Search, UserPlus, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RankBadge, CategoryBadge } from '@/components/ui/badge';
import { formatWaitTime } from '@/lib/utils';
import type { QueueEntry } from '@/types';

interface QueueListProps {
  queue: QueueEntry[];
  loading: boolean;
  onAddPlayer: () => void;
  onRunMatchmaking: () => void;
  onRemoveFromQueue: (playerId: string) => void;
  matchmakingLoading: boolean;
}

export function QueueList({
  queue,
  loading,
  onAddPlayer,
  onRunMatchmaking,
  onRemoveFromQueue,
  matchmakingLoading,
}: QueueListProps) {
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  const filtered = queue.filter(entry => {
    const p = entry.player;
    if (!p) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (rankFilter && p.rank !== rankFilter) return false;
    if (genderFilter && p.gender !== genderFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search players..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <select
            value={rankFilter}
            onChange={e => setRankFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Ranks</option>
            {['A', 'B', 'C', 'D', 'E'].map(r => <option key={r} value={r}>Rank {r}</option>)}
          </select>
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={onAddPlayer}>
            <UserPlus size={15} /> Add Player
          </Button>
          <Button size="sm" onClick={onRunMatchmaking} loading={matchmakingLoading}>
            <Play size={15} /> Run Matchmaking
          </Button>
        </div>
      </div>

      {/* Queue count */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        <span>{filtered.length} player{filtered.length !== 1 ? 's' : ''} in queue</span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No players in queue</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add players or scan the QR code to join</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry, idx) => {
            const p = entry.player!;
            const cats = Array.isArray(p.preferredCategories) ? p.preferredCategories : [];
            return (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-700 transition-all animate-fade-in"
              >
                {/* Position */}
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                  {idx + 1}
                </div>

                {/* Name + gender */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white truncate">
                      {p.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {p.gender === 'Male' ? '♂' : '♀'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cats.map(cat => (
                      <CategoryBadge key={cat} category={cat} />
                    ))}
                  </div>
                </div>

                {/* Rank */}
                <RankBadge rank={p.rank} />

                {/* Stats */}
                <div className="hidden sm:flex flex-col items-end gap-0.5">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {formatWaitTime(p.waitingStartTime)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {p.gamesPlayed} games
                  </span>
                </div>

                {/* Remove */}
                <button
                  onClick={() => onRemoveFromQueue(p.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Remove from queue"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
