'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, MapPin, Phone, Users, X, Clock,
  Play, Trophy, Swords, AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RankBadge, StatusBadge, CategoryBadge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { useSocket } from '@/hooks/useSocket';
import type { Rank, PlayerStatus, MatchCategory } from '@/types';

interface ScheduleDetail {
  id: string;
  name: string | null;
  courtName: string;
  courtContact: string;
  contactPerson: string;
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

interface ActiveMatch {
  id: string;
  category: MatchCategory;
  startTime: string;
  team1: { id: string; name: string; rank: Rank }[];
  team2: { id: string; name: string; rank: Rank }[];
}

export default function ScheduleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [scheduleRes, matchRes] = await Promise.all([
        fetch(`/api/qmaster/schedules/${params.id}`),
        fetch(`/api/matches?status=Playing&limit=50`),
      ]);
      if (scheduleRes.status === 401) { router.push('/qmaster/login'); return; }
      if (scheduleRes.status === 403) { router.push('/qmaster'); return; }
      if (scheduleRes.ok) setSchedule(await scheduleRes.json());

      // Find the active match scoped to this schedule
      if (matchRes.ok) {
        const { matches } = await matchRes.json();
        const mine = matches.find((m: any) => m.scheduleId === params.id);
        if (mine) {
          setActiveMatch({
            id: mine.id,
            category: mine.category,
            startTime: mine.startTime,
            team1: mine.players.filter((p: any) => p.team === 1).map((p: any) => ({
              id: p.player.id, name: p.player.name, rank: p.player.rank,
            })),
            team2: mine.players.filter((p: any) => p.team === 2).map((p: any) => ({
              id: p.player.id, name: p.player.name, rank: p.player.rank,
            })),
          });
        } else {
          setActiveMatch(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => { refresh(); }, [refresh]);
  useSocket({
    'schedule:update': refresh,
    'match:created': refresh,
    'match:ended': refresh,
  });

  const removePlayer = async (playerId: string) => {
    if (!confirm('Remove this player from the schedule?')) return;
    await fetch(`/api/qmaster/schedules/${params.id}/queue/${playerId}`, { method: 'DELETE' });
    refresh();
  };

  const runMatchmaking = async () => {
    setActionLoading(true); setError(null);
    try {
      const res = await fetch(`/api/qmaster/schedules/${params.id}/matchmaking`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      refresh();
    } finally { setActionLoading(false); }
  };

  const endMatch = async (winningTeam: number | null) => {
    if (!activeMatch) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/qmaster/schedules/${params.id}/matchmaking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winningTeam }),
      });
      if (res.ok) refresh();
    } finally { setActionLoading(false); }
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
          <div className="flex items-center gap-2 text-blue-100 col-span-2">
            <Users size={13} /> {schedule.contactPerson}
          </div>
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
        {/* Active match */}
        {activeMatch && (
          <Card className="p-4 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/10 dark:to-gray-800/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Swords size={16} className="text-blue-600" />
                <span className="font-bold text-sm">Match in progress</span>
              </div>
              <CategoryBadge category={activeMatch.category} />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-brand-600 uppercase">Team 1</p>
                {activeMatch.team1.map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <RankBadge rank={p.rank} />
                    <span className="text-sm font-medium truncate">{p.name}</span>
                  </div>
                ))}
              </div>
              <span className="text-xs font-bold text-gray-300">VS</span>
              <div className="space-y-1 text-right">
                <p className="text-xs font-semibold text-blue-600 uppercase">Team 2</p>
                {activeMatch.team2.map(p => (
                  <div key={p.id} className="flex items-center gap-2 justify-end">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    <RankBadge rank={p.rank} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="primary" loading={actionLoading} onClick={() => endMatch(1)}>
                <Trophy size={13} /> T1 Won
              </Button>
              <Button size="sm" variant="secondary" loading={actionLoading} onClick={() => endMatch(null)}>
                End
              </Button>
              <Button size="sm" variant="outline" loading={actionLoading} onClick={() => endMatch(2)}>
                <Trophy size={13} /> T2 Won
              </Button>
            </div>
          </Card>
        )}

        {/* Run matchmaking */}
        {!activeMatch && (
          <Card className="p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Court is open
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Run matchmaking to pair 4 players from your queue.
            </p>
            {error && (
              <div className="flex items-start gap-2 mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}
            <Button
              onClick={runMatchmaking} loading={actionLoading}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              <Play size={14} /> Run Matchmaking
            </Button>
          </Card>
        )}

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
