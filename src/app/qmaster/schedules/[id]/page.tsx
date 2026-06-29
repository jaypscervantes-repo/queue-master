'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, MapPin, Phone, Users, Clock,
  Play, Trophy, Swords, AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RankBadge, CategoryBadge } from '@/components/ui/badge';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { NavTabs, type Tab } from '@/components/dashboard/NavTabs';
import { QueueList } from '@/components/queue/QueueList';
import { MatchHistory } from '@/components/matches/MatchHistory';
import { PlayersList } from '@/components/players/PlayersList';
import { PlayerModal } from '@/components/players/PlayerModal';
import { Analytics } from '@/components/analytics/Analytics';
import { format } from 'date-fns';
import { useSocket } from '@/hooks/useSocket';
import { getPlayersByTeam } from '@/lib/utils';
import type {
  Rank, PlayerStatus, MatchCategory, Player, Match, QueueEntry,
  Gender, DashboardStats,
} from '@/types';

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
  const [pastMatches, setPastMatches] = useState<Match[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('queue');
  const [toast, setToast] = useState<string | null>(null);

  // Player modal state
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [scheduleRes, matchesRes, playersRes] = await Promise.all([
        fetch(`/api/qmaster/schedules/${params.id}`),
        fetch(`/api/qmaster/schedules/${params.id}/matches`),
        fetch('/api/players?active=true'),
      ]);
      if (scheduleRes.status === 401) { router.push('/qmaster/login'); return; }
      if (scheduleRes.status === 403) { router.push('/qmaster'); return; }
      if (scheduleRes.ok) setSchedule(await scheduleRes.json());

      if (matchesRes.ok) {
        const allMatches: Match[] = await matchesRes.json();
        const active = allMatches.find(m => m.status === 'Playing');
        const past = allMatches.filter(m => m.status === 'Completed');
        if (active) {
          setActiveMatch({
            id: active.id,
            category: active.category,
            startTime: active.startTime,
            team1: active.players.filter(p => p.team === 1).map(p => ({
              id: p.playerId, name: p.player!.name, rank: p.player!.rank,
            })),
            team2: active.players.filter(p => p.team === 2).map(p => ({
              id: p.playerId, name: p.player!.name, rank: p.player!.rank,
            })),
          });
        } else { setActiveMatch(null); }
        setPastMatches(past);
      }

      if (playersRes.ok) setAllPlayers(await playersRes.json());
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => { refresh(); }, [refresh]);
  useSocket({
    'schedule:update': refresh,
    'match:created': refresh,
    'match:ended': refresh,
    'player:update': refresh,
    'queue:update': refresh,
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── Player actions ──────────────────────────────────────────────────

  const addPlayerToQueue = async (playerId: string) => {
    setActionLoading(true); setError(null);
    try {
      const res = await fetch(`/api/qmaster/schedules/${params.id}/queue/${playerId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not add'); showToast(data.error); return; }
      showToast('Added to queue');
      refresh();
    } finally { setActionLoading(false); }
  };

  const removePlayerFromQueue = async (playerId: string) => {
    await fetch(`/api/qmaster/schedules/${params.id}/queue/${playerId}`, { method: 'DELETE' });
    showToast('Removed from queue');
    refresh();
  };

  const handlePlayerSubmit = async (data: {
    name: string; gender: Gender; rank: Rank; preferredCategories: MatchCategory[];
  }) => {
    if (editPlayer) {
      const res = await fetch(`/api/players/${editPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Player updated');
    } else {
      // Create player (global) then add to this schedule's queue
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const created = await res.json();
      await fetch(`/api/qmaster/schedules/${params.id}/queue/${created.id}`, { method: 'POST' });
      showToast('Player added and queued');
    }
    setEditPlayer(null);
    refresh();
  };

  const deactivatePlayer = async (playerId: string) => {
    await fetch(`/api/players/${playerId}`, { method: 'DELETE' });
    showToast('Player deactivated');
    refresh();
  };

  // ── Matchmaking ─────────────────────────────────────────────────────

  const runMatchmaking = async () => {
    setActionLoading(true); setError(null);
    try {
      const res = await fetch(`/api/qmaster/schedules/${params.id}/matchmaking`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); showToast(data.error); return; }
      showToast('Match started');
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
      if (res.ok) { showToast('Match ended'); refresh(); }
    } finally { setActionLoading(false); }
  };

  // ── Loading state ───────────────────────────────────────────────────

  if (loading || !schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  // ── Derive stats ────────────────────────────────────────────────────

  const start = new Date(schedule.startTime);
  const end = new Date(schedule.endTime);

  const totalQueued = schedule.queueEntries.length;
  const activeCourts = activeMatch ? 1 : 0;
  const playingNow = activeMatch ? 4 : 0;
  const avgWaitMinutes = totalQueued > 0
    ? Math.round(
        schedule.queueEntries.reduce((s, e) => {
          return s + (Date.now() - new Date(e.joinedAt).getTime()) / 60_000;
        }, 0) / totalQueued
      )
    : 0;

  const stats: DashboardStats = { totalQueued, activeCourts, playingNow, waitingPlayers: totalQueued, avgWaitMinutes };

  // ── Adapter: ScheduleQueueEntries → QueueEntry[] for QueueList ─────

  const queueAdapted: QueueEntry[] = schedule.queueEntries.map((e, idx) => {
    const full = allPlayers.find(p => p.id === e.player.id);
    return {
      id: e.id,
      playerId: e.player.id,
      position: idx + 1,
      queuedAt: e.joinedAt,
      player: full ?? ({
        id: e.player.id,
        name: e.player.name,
        rank: e.player.rank,
        status: e.player.status,
        gender: 'Male',
        preferredCategories: [],
        gamesPlayed: e.player.gamesPlayed,
        totalWins: e.player.totalWins,
        checkInTime: null,
        waitingStartTime: e.joinedAt,
        autoRequeue: true,
        active: true,
        createdAt: '',
        updatedAt: '',
      } as Player),
    };
  });

  const queuedIds = new Set(schedule.queueEntries.map(e => e.player.id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Schedule header */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 px-4 pt-6 pb-12 text-white">
        <Link href="/qmaster" className="inline-flex items-center gap-2 text-blue-100 text-sm mb-3 hover:text-white">
          <ArrowLeft size={14} /> Back to schedules
        </Link>
        {schedule.name && <p className="text-xs text-blue-100 mb-1">{schedule.name}</p>}
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MapPin size={20} /> {schedule.courtName}
        </h1>
        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
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

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 -mt-6 pb-6 space-y-6">
        {/* Stats cards */}
        <StatsCards stats={stats} />

        {/* Active match or matchmaking control */}
        {activeMatch ? (
          <Card className="p-5 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/10 dark:to-gray-800/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Swords size={16} className="text-blue-600" />
                <span className="font-bold">Match in progress</span>
              </div>
              <CategoryBadge category={activeMatch.category} />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-4">
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
              <Button size="sm" variant="secondary" loading={actionLoading} onClick={() => endMatch(null)}>End</Button>
              <Button size="sm" variant="outline" loading={actionLoading} onClick={() => endMatch(2)}>
                <Trophy size={13} /> T2 Won
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Court is open</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Pair 4 players from the queue and start the next match.
            </p>
            {error && (
              <div className="flex items-start gap-2 mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}
            <Button onClick={runMatchmaking} loading={actionLoading} className="w-full bg-blue-500 hover:bg-blue-600">
              <Play size={14} /> Run Matchmaking
            </Button>
          </Card>
        )}

        {/* Tabs */}
        <NavTabs active={tab} onChange={setTab} />

        <Card className="p-6">
          {tab === 'queue' && (
            <QueueList
              queue={queueAdapted}
              loading={loading}
              onAddPlayer={() => { setEditPlayer(null); setPlayerModalOpen(true); }}
              onRunMatchmaking={runMatchmaking}
              onRemoveFromQueue={removePlayerFromQueue}
              matchmakingLoading={actionLoading}
              availableCourtCount={activeMatch ? 0 : 1}
              avgMatchDuration={15}
            />
          )}

          {tab === 'courts' && (
            <SingleCourtPanel
              schedule={schedule}
              activeMatch={activeMatch}
              onEndMatch={endMatch}
              onRunMatchmaking={runMatchmaking}
              actionLoading={actionLoading}
            />
          )}

          {tab === 'history' && (
            <MatchHistory
              matches={pastMatches}
              total={pastMatches.length}
              loading={false}
              onLoadMore={() => {}}
            />
          )}

          {tab === 'players' && (
            <PlayersList
              players={allPlayers.filter(p => p.active)}
              loading={false}
              onAddPlayer={() => { setEditPlayer(null); setPlayerModalOpen(true); }}
              onEditPlayer={p => { setEditPlayer(p); setPlayerModalOpen(true); }}
              onJoinQueue={addPlayerToQueue}
              onLeaveForTheDay={p => removePlayerFromQueue(p.id)}
              onDeactivate={deactivatePlayer}
            />
          )}

          {tab === 'analytics' && <Analytics />}
        </Card>
      </main>

      <PlayerModal
        open={playerModalOpen}
        onClose={() => { setPlayerModalOpen(false); setEditPlayer(null); }}
        onSubmit={handlePlayerSubmit}
        initial={editPlayer}
        title={editPlayer ? 'Edit Player' : 'Add Player to Queue'}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium shadow-2xl animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Single court panel (since each schedule is one court) ─────────────

function SingleCourtPanel({
  schedule, activeMatch, onEndMatch, onRunMatchmaking, actionLoading,
}: {
  schedule: ScheduleDetail;
  activeMatch: ActiveMatch | null;
  onEndMatch: (winner: number | null) => void;
  onRunMatchmaking: () => void;
  actionLoading: boolean;
}) {
  return (
    <div>
      <div className={`px-5 py-3 flex items-center justify-between rounded-t-2xl ${
        activeMatch
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
          : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Swords size={16} />
          </div>
          <span className="font-bold text-lg">{schedule.courtName}</span>
        </div>
        <span className="text-xs font-bold uppercase">
          {activeMatch ? 'Occupied' : 'Available'}
        </span>
      </div>
      <div className="p-5 border border-t-0 border-gray-100 dark:border-gray-700 rounded-b-2xl">
        {activeMatch ? (
          <>
            <CategoryBadge category={activeMatch.category} />
            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 my-4 border border-brand-100 dark:border-brand-800">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-brand-600 uppercase">Team 1</p>
                  {activeMatch.team1.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm">
                      <RankBadge rank={p.rank} />
                      <span className="text-sm font-medium truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-px h-8 bg-gray-300" />
                  <span className="text-xs font-bold text-gray-400">VS</span>
                  <div className="w-px h-8 bg-gray-300" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-blue-600 uppercase text-right">Team 2</p>
                  {activeMatch.team2.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm justify-end">
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      <RankBadge rank={p.rank} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="primary" loading={actionLoading} onClick={() => onEndMatch(1)} className="text-xs">
                <Trophy size={13} /> Team 1 Wins
              </Button>
              <Button size="sm" variant="secondary" loading={actionLoading} onClick={() => onEndMatch(null)} className="text-xs">
                No Result
              </Button>
              <Button size="sm" variant="outline" loading={actionLoading} onClick={() => onEndMatch(2)} className="text-xs">
                <Trophy size={13} /> Team 2 Wins
              </Button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Swords size={24} className="text-brand-400" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-300">Court Available</p>
            <p className="text-sm text-gray-400 mt-1">Run matchmaking to assign the next match</p>
            <Button onClick={onRunMatchmaking} loading={actionLoading} className="mt-4 bg-blue-500 hover:bg-blue-600">
              <Play size={14} /> Run Matchmaking
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
