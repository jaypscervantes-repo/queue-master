'use client';

import { Dialog } from '@/components/ui/dialog';
import { CategoryBadge, RankBadge } from '@/components/ui/badge';
import { MapPin, Swords, Clock } from 'lucide-react';
import { formatMatchTime, formatMatchDuration, getPlayersByTeam } from '@/lib/utils';
import type { Court } from '@/types';

interface ActiveCourtsModalProps {
  open: boolean;
  onClose: () => void;
  courts: Court[];
}

export function ActiveCourtsModal({ open, onClose, courts }: ActiveCourtsModalProps) {
  const active = courts.filter(c => c.status === 'Occupied' && c.currentMatch);

  return (
    <Dialog open={open} onClose={onClose} title="Active Courts" size="lg">
      {active.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <MapPin size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No active courts</p>
          <p className="text-sm text-gray-400 mt-1">All courts are available.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(court => {
            const m = court.currentMatch!;
            const team1 = getPlayersByTeam(m.players, 1);
            const team2 = getPlayersByTeam(m.players, 2);
            return (
              <div
                key={court.id}
                className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/10 dark:to-gray-800/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Swords size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{court.name}</p>
                      <CategoryBadge category={m.category} />
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <div className="flex items-center gap-1 justify-end">
                      <Clock size={11} />
                      Started {formatMatchTime(m.startTime)}
                    </div>
                    <div>{formatMatchDuration(m.startTime)} elapsed</div>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase">Team 1</p>
                    {team1.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <RankBadge rank={p.rank} />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.name}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-300 dark:text-gray-600">VS</span>
                  <div className="space-y-1 text-right">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Team 2</p>
                    {team2.map(p => (
                      <div key={p.id} className="flex items-center gap-2 justify-end">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.name}</span>
                        <RankBadge rank={p.rank} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}

interface PlayingNowModalProps {
  open: boolean;
  onClose: () => void;
  courts: Court[];
}

export function PlayingNowModal({ open, onClose, courts }: PlayingNowModalProps) {
  // Flatten all players currently playing with their court
  const entries: { courtName: string; courtId: string; name: string; rank: string; team: number }[] = [];

  for (const court of courts) {
    if (court.status !== 'Occupied' || !court.currentMatch) continue;
    for (const mp of court.currentMatch.players) {
      if (mp.player) {
        entries.push({
          courtName: court.name,
          courtId: court.id,
          name: mp.player.name,
          rank: mp.player.rank,
          team: mp.team,
        });
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Playing Now" size="md">
      {entries.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Swords size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No one is playing right now</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {entries.length} player{entries.length === 1 ? '' : 's'} currently on court
          </p>
          {entries.map((e, i) => (
            <div
              key={`${e.courtId}-${e.name}-${i}`}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl"
            >
              <RankBadge rank={e.rank as any} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{e.name}</p>
                <p className="text-xs text-gray-400">
                  {e.courtName} · Team {e.team}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                <MapPin size={11} />
                {e.courtName}
              </div>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}
