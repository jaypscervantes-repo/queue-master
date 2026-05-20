'use client';

import { useState } from 'react';
import { Trophy, Clock } from 'lucide-react';
import { RankBadge, CategoryBadge } from '@/components/ui/badge';
import { formatMatchTime, formatMatchDuration, getPlayersByTeam } from '@/lib/utils';
import type { Match } from '@/types';

interface MatchHistoryProps {
  matches: Match[];
  total: number;
  loading: boolean;
  onLoadMore: (page: number) => void;
}

export function MatchHistory({ matches, total, loading, onLoadMore }: MatchHistoryProps) {
  const [page, setPage] = useState(1);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    onLoadMore(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {matches.length} of {total} matches
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">No match history yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(match => {
            const team1 = getPlayersByTeam(match.players, 1);
            const team2 = getPlayersByTeam(match.players, 2);

            return (
              <div
                key={match.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 animate-fade-in"
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={match.category} />
                    <span className="text-xs text-gray-400">{match.court?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={12} />
                    {formatMatchTime(match.startTime)}
                    {match.endTime && ` · ${formatMatchDuration(match.startTime, match.endTime)}`}
                  </div>
                </div>

                {/* Teams */}
                <div className="flex items-center gap-3">
                  {/* Team 1 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      {match.winningTeam === 1 && <Trophy size={12} className="text-yellow-500 flex-shrink-0" />}
                      <span className={`text-xs font-semibold ${match.winningTeam === 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}`}>
                        Team 1 {match.winningTeam === 1 ? '· Winner' : ''}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {team1.map(p => (
                        <div key={p.id} className="flex items-center gap-1.5">
                          <RankBadge rank={p.rank} />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* VS */}
                  <div className="text-xs font-bold text-gray-300 dark:text-gray-600 flex-shrink-0">VS</div>

                  {/* Team 2 */}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-1 justify-end mb-0.5">
                      <span className={`text-xs font-semibold ${match.winningTeam === 2 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}`}>
                        {match.winningTeam === 2 ? 'Winner ·' : ''} Team 2
                      </span>
                      {match.winningTeam === 2 && <Trophy size={12} className="text-yellow-500 flex-shrink-0" />}
                    </div>
                    <div className="space-y-1">
                      {team2.map(p => (
                        <div key={p.id} className="flex items-center gap-1.5 justify-end">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{p.name}</span>
                          <RankBadge rank={p.rank} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {matches.length < total && (
        <div className="text-center pt-2">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-sm text-brand-500 hover:text-brand-600 font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
