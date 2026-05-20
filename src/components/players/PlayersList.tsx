'use client';

import { useState } from 'react';
import { Search, UserPlus, Edit, Trash2, LogIn, LogOut, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RankBadge, StatusBadge, CategoryBadge } from '@/components/ui/badge';
import type { Player } from '@/types';

interface PlayersListProps {
  players: Player[];
  loading: boolean;
  onAddPlayer: () => void;
  onEditPlayer: (player: Player) => void;
  onJoinQueue: (playerId: string) => void;
  onLeaveQueue: (playerId: string) => void;
  onTogglePause: (player: Player) => void;
  onDeactivate: (playerId: string) => void;
}

export function PlayersList({
  players,
  loading,
  onAddPlayer,
  onEditPlayer,
  onJoinQueue,
  onLeaveQueue,
  onTogglePause,
  onDeactivate,
}: PlayersListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = players.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-0">
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
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="Queued">Queued</option>
            <option value="Playing">Playing</option>
            <option value="Offline">Offline</option>
            <option value="Paused">Paused</option>
          </select>
        </div>
        <Button size="sm" onClick={onAddPlayer}>
          <UserPlus size={14} /> Add Player
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Player</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Gender</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Rank</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 hidden md:table-cell">Categories</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 hidden sm:table-cell">Games</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 hidden sm:table-cell">Wins</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(player => {
              const cats = Array.isArray(player.preferredCategories) ? player.preferredCategories : [];
              return (
                <tr
                  key={player.id}
                  className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{player.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{player.gender === 'Male' ? '♂' : '♀'}</td>
                  <td className="px-4 py-3"><RankBadge rank={player.rank} /></td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {cats.map(cat => <CategoryBadge key={cat} category={cat} />)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell text-gray-600 dark:text-gray-400">{player.gamesPlayed}</td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell text-gray-600 dark:text-gray-400">{player.totalWins}</td>
                  <td className="px-4 py-3"><StatusBadge status={player.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEditPlayer(player)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>

                      {player.status === 'Offline' || player.status === 'Paused' ? (
                        <button
                          onClick={() => onJoinQueue(player.id)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 text-gray-400 hover:text-brand-600 transition-colors"
                          title="Add to Queue"
                        >
                          <LogIn size={14} />
                        </button>
                      ) : player.status === 'Queued' ? (
                        <button
                          onClick={() => onLeaveQueue(player.id)}
                          className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-gray-400 hover:text-yellow-600 transition-colors"
                          title="Remove from Queue"
                        >
                          <LogOut size={14} />
                        </button>
                      ) : null}

                      {player.status !== 'Playing' && (
                        <button
                          onClick={() => onTogglePause(player)}
                          className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-400 hover:text-orange-600 transition-colors"
                          title={player.status === 'Paused' ? 'Unpause' : 'Pause'}
                        >
                          {player.status === 'Paused' ? <Play size={14} /> : <Pause size={14} />}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm(`Remove ${player.name} from the system?`)) onDeactivate(player.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                        title="Deactivate"
                        disabled={player.status === 'Playing'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            No players found
          </div>
        )}
      </div>
    </div>
  );
}
