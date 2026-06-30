'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, MapPin, Phone, Users, Clock, AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { NavTabs, type Tab } from '@/components/dashboard/NavTabs';
import { QueueList } from '@/components/queue/QueueList';
import { CourtsList } from '@/components/courts/CourtsList';
import { MatchHistory } from '@/components/matches/MatchHistory';
import { PlayersList } from '@/components/players/PlayersList';
import { PlayerModal } from '@/components/players/PlayerModal';
import { Analytics } from '@/components/analytics/Analytics';
import { format } from 'date-fns';
import { useSocket } from '@/hooks/useSocket';
import type {
  Rank, PlayerStatus, MatchCategory, Player, Match, QueueEntry, Court,
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
  courts: Court[];
}

export default function ScheduleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [pastMatches, setPastMatches] = useState<Match[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('queue');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
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
        const all: Match[] = await matchesRes.json();
        setPastMatches(all.filter(m => m.status === 'Completed'));
      }
      if (playersRes.ok) setAllPlayers(await playersRes.json());
    } finally { setLoading(false); }
  }, [params.id, router]);

  useEffect(() => { refresh(); }, [refresh]);
  useSocket({
    'schedule:update': refresh,
    'match:created': refresh,
    'match:ended': refresh,
    'player:update': refresh,
    'queue:update': refresh,
    'court:update': refresh,
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Player actions ──
  const addPlayerToQueue = async (playerId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/qmaster/schedules/${params.id}/queue/${playerId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { showToast(data.error, 'error'); return; }
      showToast('Added to queue'); refresh();
    } finally { setActionLoading(false); }
  };
  const removePlayerFromQueue = async (playerId: string) => {
    await fetch(`/api/qmaster/schedules/${params.id}/queue/${playerId}`, { method: 'DELETE' });
    showToast('Removed from queue'); refresh();
  };
  const handlePlayerSubmit = async (data: { name: string; gender: Gender; rank: Rank; preferredCategories: MatchCategory[] }) => {
    if (editPlayer) {
      const res = await fetch(`/api/players/${editPlayer.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Player updated');
    } else {
      const res = await fetch('/api/players', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const created = await res.json();
      await fetch(`/api/qmaster/schedules/${params.id}/queue/${created.id}`, { method: 'POST' });
      showToast('Player added and queued');
    }
    setEditPlayer(null); refresh();
  };
  const deactivatePlayer = async (playerId: string) => {
    await fetch(`/api/players/${playerId}`, { method: 'DELETE' });
    showToast('Player deactivated'); refresh();
  };

  // ── Matchmaking ──
  const runMatchmaking = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/qmaster/schedules/${params.id}/matchmaking`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { showToast(data.error, 'error'); return; }
      showToast(`${data.matches.length} match(es) started`); refresh();
    } finally { setActionLoading(false); }
  };
  const endMatch = async (matchId: string, winningTeam: number | null) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/qmaster/schedules/${params.id}/matchmaking`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, winningTeam }),
      });
      if (res.ok) { showToast('Match ended'); refresh(); }
    } finally { setActionLoading(false); }
  };

  // ── Court management ──
  const addCourt = async (name: string) => {
    const res = await fetch(`/api/qmaster/schedules/${params.id}/courts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) { showToast((await res.json()).error, 'error'); return; }
    showToast(`${name} added`); refresh();
  };
  const removeCourt = async (courtId: string) => {
    const res = await fetch(`/api/qmaster/schedules/${params.id}/courts/${courtId}`, { method: 'DELETE' });
    if (!res.ok) { showToast((await res.json()).error, 'error'); return; }
    showToast('Court removed'); refresh();
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

  // ── Derive stats from courts ──
  const totalQueued = schedule.queueEntries.length;
  const activeCourts = schedule.courts.filter(c => c.status === 'Occupied').length;
  const playingNow = schedule.courts.reduce(
    (sum, c) => sum + (c.currentMatch ? c.currentMatch.players.length : 0), 0
  );
  const avgWaitMinutes = totalQueued > 0
    ? Math.round(schedule.queueEntries.reduce((s, e) =>
        s + (Date.now() - new Date(e.joinedAt).getTime()) / 60_000, 0
      ) / totalQueued)
    : 0;
  const stats: DashboardStats = { totalQueued, activeCourts, playingNow, waitingPlayers: totalQueued, avgWaitMinutes };

  // ── Adapter: ScheduleQueueEntries → QueueEntry[] for QueueList ──
  const queueAdapted: QueueEntry[] = schedule.queueEntries.map((e, idx) => {
    const full = allPlayers.find(p => p.id === e.player.id);
    return {
      id: e.id, playerId: e.player.id, position: idx + 1, queuedAt: e.joinedAt,
      player: full ?? ({
        id: e.player.id, name: e.player.name, rank: e.player.rank, status: e.player.status,
        gender: 'Male', preferredCategories: [], gamesPlayed: e.player.gamesPlayed,
        totalWins: e.player.totalWins, checkInTime: null, waitingStartTime: e.joinedAt,
        autoRequeue: true, active: true, createdAt: '', updatedAt: '',
      } as Player),
    };
  });

  const availableCourtCount = schedule.courts.filter(c => c.status === 'Available').length;

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
        <div className="mt-3 flex flex-col gap-1.5 text-sm text-blue-100">
          <div className="flex items-center gap-2"><Users size={13} className="flex-shrink-0" /> {schedule.contactPerson}</div>
          <div className="flex items-center gap-2"><Phone size={13} className="flex-shrink-0" /> {schedule.courtContact}</div>
          <div className="flex items-center gap-2">
            <Calendar size={13} className="flex-shrink-0" /> {format(start, 'MMM d')}
            <span className="text-blue-200 mx-1">·</span>
            <Clock size={13} className="flex-shrink-0" /> {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
          </div>
        </div>
      </div>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 -mt-6 pb-6 space-y-6">
        <StatsCards stats={stats} />

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
              availableCourtCount={availableCourtCount}
              avgMatchDuration={15}
            />
          )}

          {tab === 'courts' && (
            <CourtsList
              courts={schedule.courts}
              onEndMatch={endMatch}
              onRunMatchmaking={runMatchmaking}
              onAddCourt={addCourt}
              onRemoveCourt={removeCourt}
              matchmakingLoading={actionLoading}
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
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl animate-slide-up ${
          toast.type === 'success' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
