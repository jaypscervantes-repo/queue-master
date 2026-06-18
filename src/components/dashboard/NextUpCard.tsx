'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Swords, Clock, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RankBadge, CategoryBadge } from '@/components/ui/badge';
import { format, addMinutes } from 'date-fns';
import type { MatchPreview, Court } from '@/types';

interface NextUpCardProps {
  courts: Court[];
  avgMatchDuration: number;
  refreshKey: number; // bumped by parent on queue/court updates
}

export function NextUpCard({ courts, avgMatchDuration, refreshKey }: NextUpCardProps) {
  const [previews, setPreviews] = useState<MatchPreview[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/matchmaking')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setPreviews(data.matches ?? []);
        setReason(data.reason ?? null);
      })
      .catch(() => {
        if (!cancelled) setReason('Could not load preview');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const courtMap = new Map(courts.map(c => [c.id, c]));

  // Predicted start time: courts that are Available start "now",
  // Occupied ones start after avg duration from their match start
  const startTimeForCourt = (courtId: string) => {
    const court = courtMap.get(courtId);
    if (!court) return new Date();
    if (court.status === 'Available') return new Date();
    if (court.currentMatch?.startTime) {
      return addMinutes(new Date(court.currentMatch.startTime), avgMatchDuration);
    }
    return new Date();
  };

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw size={14} className="animate-spin" /> Loading next match...
        </div>
      </Card>
    );
  }

  if (previews.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Next Up</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {reason ?? 'No upcoming match — add players or end an ongoing match.'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-base">Next Up</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Predicted matches if you run matchmaking now
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {previews.map((match, idx) => {
          const court = courtMap.get(match.courtId);
          const startTime = startTimeForCourt(match.courtId);
          const isWaiting = court?.status !== 'Available';

          return (
            <div
              key={idx}
              className="bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-gray-800/50 border border-brand-100 dark:border-brand-800/50 rounded-xl p-3.5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Swords size={13} className="text-brand-600 dark:text-brand-400" />
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {court?.name ?? 'Court'}
                  </span>
                </div>
                <CategoryBadge category={match.category} />
              </div>

              <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
                <Clock size={11} />
                {isWaiting ? (
                  <span>~{format(startTime, 'HH:mm')} (court busy)</span>
                ) : (
                  <span className="text-brand-600 dark:text-brand-400 font-medium">Ready now</span>
                )}
              </div>

              <div className="space-y-1.5">
                {[...match.team1, ...match.team2].map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <RankBadge rank={p.rank} />
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{p.name}</span>
                    {i === 1 && (
                      <span className="text-[10px] text-gray-400 ml-auto">vs</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
