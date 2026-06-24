'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, MapPin, Phone, Users, X, Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RankBadge, StatusBadge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { useSocket } from '@/hooks/useSocket';
import type { Rank, PlayerStatus } from '@/types';

interface ScheduleDetail {
  id: string;
  name: string | null;
  courtName: string;
  courtContact: string;
  startTime: string;
  endTime: string;
  queueEntries: Array<{
    id: string;
    joinedAt: string;
    player: {
      id: string;
      name: string;
      rank: Rank;
      status: PlayerStatus;
      gamesPlayed: number;
      totalWins: number;
    };
  }>;
}

export default function ScheduleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/qmaster/schedules/${params.id}`);
      if (res.status === 401) { router.push('/qmaster/login'); return; }
      if (res.status === 403) { router.push('/qmaster'); return; }
      if (res.ok) setSchedule(await res.json());
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => { refresh(); }, [refresh]);
  useSocket({ 'schedule:update': refresh });

  const removePlayer = async (playerId: string) => {
    if (!confirm('Remove this player from the schedule?')) return;
    await fetch(`/api/qmaster/schedules/${params.id}/queue/${playerId}`, { method: 'DELETE' });
    refresh();
  };

  if (loading || !schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const start = new Date(schedule.startTime);
  const end = new Date(schedule.endTime);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 px-4 pt-6 pb-16 text-white">
        <Link href="/qmaster" className="inline-flex items-center gap-2 text-blue-100 text-sm mb-3 hover:text-white">
          <ArrowLeft size={14} /> Back to schedules
        </Link>

        {schedule.name && <p className="text-xs text-blue-100 mb-1">{schedule.name}</p>}
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MapPin size={20} /> {schedule.courtName}
        </h1>

        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div className="flex items-center gap-2 text-blue-100">
            <Phone size={13} /> {schedule.courtContact}
          </div>
          <div className="flex items-center gap-2 text-blue-100">
            <Calendar size={13} /> {format(start, 'MMM d')}
          </div>
          <div className="flex items-center gap-2 text-blue-100 col-span-2">
            <Clock size={13} /> {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10 space-y-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Players Joined
            </p>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {schedule.queueEntries.length}
            </span>
          </div>

          {schedule.queueEntries.length === 0 ? (
            <div className="text-center py-8">
              <Users size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No players have joined yet</p>
              <p className="text-xs text-gray-400 mt-1">Share your portal so players can browse and join</p>
            </div>
          ) : (
            <div className="space-y-2">
              {schedule.queueEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl"
                >
                  <span className="w-6 text-sm font-bold text-gray-400 flex-shrink-0">{idx + 1}</span>
                  <RankBadge rank={entry.player.rank} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{entry.player.name}</p>
                    <p className="text-xs text-gray-400">
                      Joined {formatDistanceToNow(new Date(entry.joinedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <StatusBadge status={entry.player.status} />
                  <button
                    onClick={() => removePlayer(entry.player.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove from schedule"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
