'use client';

import { useState } from 'react';
import { Trophy, Square, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RankBadge, CategoryBadge, StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatMatchTime, formatMatchDuration, getPlayersByTeam } from '@/lib/utils';
import type { Court } from '@/types';

interface CourtCardProps {
  court: Court;
  onEndMatch: (matchId: string, winningTeam: number | null) => void;
}

export function CourtCard({ court, onEndMatch }: CourtCardProps) {
  const [ending, setEnding] = useState(false);
  const match = court.currentMatch;

  const handleEnd = async (winner: number | null) => {
    if (!match) return;
    setEnding(true);
    try {
      await onEndMatch(match.id, winner);
    } finally {
      setEnding(false);
    }
  };

  const team1 = match ? getPlayersByTeam(match.players, 1) : [];
  const team2 = match ? getPlayersByTeam(match.players, 2) : [];

  return (
    <Card className="overflow-hidden">
      {/* Court header */}
      <div
        className={`px-5 py-3 flex items-center justify-between ${
          match
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
            : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Swords size={16} />
          </div>
          <span className="font-bold text-lg">{court.name}</span>
        </div>
        <StatusBadge status={court.status} />
      </div>

      <div className="p-5">
        {match ? (
          <>
            {/* Match info */}
            <div className="flex items-center justify-between mb-4">
              <CategoryBadge category={match.category} />
              <div className="text-right text-xs text-gray-400">
                <div>Started {formatMatchTime(match.startTime)}</div>
                <div>{formatMatchDuration(match.startTime)} elapsed</div>
              </div>
            </div>

            {/* Court visual */}
            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 mb-4 border border-brand-100 dark:border-brand-800">
              {/* Net line */}
              <div className="flex gap-3 items-center">
                {/* Team 1 */}
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">Team 1</p>
                  {team1.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm">
                      <RankBadge rank={p.rank} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</span>
                    </div>
                  ))}
                </div>

                {/* VS divider */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500">VS</span>
                  <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />
                </div>

                {/* Team 2 */}
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide text-right">Team 2</p>
                  {team2.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm justify-end">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</span>
                      <RankBadge rank={p.rank} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* End match buttons */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Select winner to end match:</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  loading={ending}
                  onClick={() => handleEnd(1)}
                  className="text-xs"
                >
                  <Trophy size={13} /> Team 1 Wins
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={ending}
                  onClick={() => handleEnd(null)}
                  className="text-xs"
                >
                  <Square size={13} /> No Result
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  loading={ending}
                  onClick={() => handleEnd(2)}
                  className="text-xs"
                >
                  <Trophy size={13} /> Team 2 Wins
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Swords size={24} className="text-brand-400" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-300">Court Available</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Run matchmaking to assign a match
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
