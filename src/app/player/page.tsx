'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, Trophy, Clock, LogOut, ChevronRight, Swords, Calendar,
  Play, DoorOpen, History, Sparkles, MapPin, CalendarDays, Bell, Phone, Check,
} from 'lucide-react';
import { RankBadge, StatusBadge, CategoryBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useSocket } from '@/hooks/useSocket';
import { formatWaitTime, formatMatchTime, isSessionActive } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import type { Player, Rank } from '@/types';

interface PlayerStats extends Omit<Player, 'matchPlayers'> {
  queuePosition: number | null;
  winRate: number;
  matchPlayers: Array<{
    team: number;
    match: {
      id: string;
      court: { name: string };
      players: Array<{ team: number; player: { name: string; rank: Rank } }>;
    };
  }>;
  session: { sessionStart: string | null; sessionEnd: string | null; avgMatchDuration: number } | null;
}

interface CompletedMatch {
  id: string;
  startTime: string;
  endTime: string | null;
  category: string;
  court: string;
  myTeam: number;
  won: boolean;
  lost: boolean;
  winningTeam: number | null;
  partner: { id: string; name: string; rank: Rank }[];
  opponents: { id: string; name: string; rank: Rank }[];
}

type Tab = 'overview' | 'schedules' | 'matches';

interface AvailableSchedule {
  id: string;
  name: string | null;
  courtName: string;
  courtContact: string;
  startTime: string;
  endTime: string;
  joined: boolean;
  qmaster: { name: string; username: string };
  _count: { queueEntries: number };
}

export default function PlayerDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matches, setMatches] = useState<CompletedMatch[]>([]);
  const [schedules, setSchedules] = useState<AvailableSchedule[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/player/stats');
      if (res.status === 401) { router.push('/player/login'); return; }
      if (res.ok) setStats(await res.json());
    } catch {}
  }, [router]);

  const refreshMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/player/matches');
      if (res.ok) setMatches(await res.json());
    } catch {}
  }, []);

  const refreshSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/schedules');
      if (res.ok) setSchedules(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    refreshMatches();
    refreshSchedules();
    // Re-poll schedules every 60s to refresh the 30-min reminder
    const t = setInterval(refreshSchedules, 60_000);
    return () => clearInterval(t);
  }, [refresh, refreshMatches, refreshSchedules]);

  // Live updates: any queue/court/match change → refresh my stats
  useSocket({
    'queue:update': refresh,
    'court:update': refresh,
    'match:created': () => { refresh(); refreshMatches(); },
    'match:ended': () => { refresh(); refreshMatches(); },
    'player:update': refresh,
    'settings:update': refresh,
    'schedule:update': refreshSchedules,
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleJoinQueue = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/player/queue', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Joined queue · Position #${data.position}`);
      refresh();
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/player/queue', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to leave');
      showToast(
        stats?.status === 'Playing'
          ? 'Will leave after this match'
          : 'Left the queue'
      );
      refresh();
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/player/login');
  };

  const handleJoinSchedule = async (scheduleId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/player/schedules/${scheduleId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Joined schedule');
      } else if (data.error === 'TIME_CONFLICT') {
        showToast(`Conflict: ${data.conflict.courtName} at the same time`);
      } else {
        showToast(data.error ?? 'Could not join');
      }
      refreshSchedules();
    } finally { setActionLoading(false); }
  };

  const handleLeaveSchedule = async (scheduleId: string) => {
    setActionLoading(true);
    try {
      await fetch(`/api/player/schedules/${scheduleId}`, { method: 'DELETE' });
      showToast('Left schedule');
      refreshSchedules();
    } finally { setActionLoading(false); }
  };

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // 30-min reminder: any joined schedule starting within the next 30 minutes (and not yet started)
  const now = new Date();
  const reminderSchedule = schedules
    .filter(s => s.joined)
    .map(s => ({ s, mins: (new Date(s.startTime).getTime() - now.getTime()) / 60_000 }))
    .filter(({ mins }) => mins > 0 && mins <= 30)
    .sort((a, b) => a.mins - b.mins)[0];

  const sessionActive = isSessionActive(stats.session?.sessionStart, stats.session?.sessionEnd);
  const sessionStart = stats.session?.sessionStart ? new Date(stats.session.sessionStart) : null;
  const sessionEnd = stats.session?.sessionEnd ? new Date(stats.session.sessionEnd) : null;

  const currentMatch = stats.matchPlayers[0]?.match;
  const myTeam = stats.matchPlayers[0]?.team;
  const partner = currentMatch?.players.find(p => p.team === myTeam && p.player.name !== stats.name)?.player;
  const opponents = currentMatch?.players.filter(p => p.team !== myTeam).map(p => p.player) ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* 30-min reminder banner */}
      {reminderSchedule && (
        <div className="bg-orange-500 text-white px-4 py-3 flex items-center gap-3 animate-fade-in">
          <Bell size={18} className="flex-shrink-0 animate-pulse" />
          <div className="text-sm flex-1 min-w-0">
            <p className="font-semibold">
              {reminderSchedule.s.courtName} starts in {Math.round(reminderSchedule.mins)} min
            </p>
            <p className="text-xs text-orange-100 truncate">
              {format(new Date(reminderSchedule.s.startTime), 'HH:mm')} · with {reminderSchedule.s.qmaster.name}
            </p>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-4 pt-8 pb-16 text-white relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs text-brand-100">Welcome back</p>
              <p className="font-bold text-base leading-tight">{stats.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Profile stats row */}
        <div className="flex items-center justify-between gap-3 mt-4">
          <RankBadge rank={stats.rank} />
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-2xl font-bold">{stats.gamesPlayed}</p>
              <p className="text-xs text-brand-100">Games</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalWins}</p>
              <p className="text-xs text-brand-100">Wins</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.winRate}%</p>
              <p className="text-xs text-brand-100">Win Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status card — overlapping the gradient */}
      <div className="px-4 -mt-10 mb-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Your Status
            </p>
            <StatusBadge status={stats.status} />
          </div>

          {stats.status === 'Playing' && currentMatch ? (
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                <Swords size={14} /> Match in progress · {currentMatch.court.name}
              </div>
              {partner && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Partner: <strong>{partner.name}</strong>
                </p>
              )}
              {opponents.length > 0 && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Opponents: {opponents.map(p => p.name).join(', ')}
                </p>
              )}
              {!stats.autoRequeue && (
                <p className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
                  <Clock size={11} /> You'll go offline after this match
                </p>
              )}
            </div>
          ) : stats.status === 'Queued' ? (
            <div>
              <p className="text-3xl font-bold text-brand-500">#{stats.queuePosition}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                in queue · waiting {formatWaitTime(stats.waitingStartTime)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You're not in the queue right now.
            </p>
          )}
        </Card>
      </div>

      {/* Action button */}
      <div className="px-4 mb-4">
        {stats.status === 'Offline' || stats.status === 'Paused' ? (
          <button
            onClick={handleJoinQueue}
            disabled={actionLoading || !sessionActive}
            className="w-full py-4 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-200 dark:shadow-brand-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {sessionActive ? <><Play size={18} /> Join Queue</> : <><Clock size={18} /> Session Not Active</>}
          </button>
        ) : (
          <button
            onClick={handleLeaveQueue}
            disabled={actionLoading}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 dark:shadow-orange-900/30 disabled:opacity-50 transition-all"
          >
            <DoorOpen size={18} />
            {stats.status === 'Playing' ? 'Leave After Match' : 'Leave Queue'}
          </button>
        )}
      </div>

      {/* Session info */}
      <div className="px-4 mb-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              sessionActive
                ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
            }`}>
              <Calendar size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {sessionActive ? 'Session is Live' : sessionStart && sessionEnd
                  ? sessionStart > new Date() ? 'Upcoming Session' : 'Session Ended'
                  : 'No Session Scheduled'}
              </p>
              {sessionStart && sessionEnd && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {format(sessionStart, 'MMM d · HH:mm')} – {format(sessionEnd, 'HH:mm')}
                </p>
              )}
            </div>
            {sessionActive && (
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            )}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {([
            { id: 'overview', label: 'Overview', icon: Sparkles },
            { id: 'schedules', label: 'Schedules', icon: CalendarDays },
            { id: 'matches', label: 'Matches', icon: History },
          ] as { id: Tab; label: string; icon: any }[]).map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 space-y-3">
        {tab === 'overview' && (
          <>
            <Card className="p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Profile</p>
              <div className="space-y-2 text-sm">
                <Row label="Username" value={`@${stats.username}`} />
                <Row label="Gender" value={stats.gender === 'Male' ? '♂ Male' : '♀ Female'} />
                <Row label="Rank" value={`${stats.rank} · ${rankLabel(stats.rank)}`} />
                <Row label="Categories">
                  <div className="flex gap-1 flex-wrap justify-end">
                    {(Array.isArray(stats.preferredCategories) ? stats.preferredCategories : []).map(c => (
                      <CategoryBadge key={c as string} category={c as string} />
                    ))}
                  </div>
                </Row>
                {stats.checkInTime && (
                  <Row label="Checked in" value={formatDistanceToNow(new Date(stats.checkInTime), { addSuffix: true })} />
                )}
              </div>
            </Card>
          </>
        )}

        {tab === 'schedules' && (
          <>
            {schedules.length === 0 ? (
              <Card className="p-8 text-center">
                <CalendarDays size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming schedules</p>
                <p className="text-xs text-gray-400 mt-1">Check back later — Q Masters post new sessions regularly</p>
              </Card>
            ) : (
              <>
                {schedules.filter(s => s.joined).length > 0 && (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 pt-2">
                    My Joined Schedules
                  </p>
                )}
                {schedules.filter(s => s.joined).map(s => (
                  <ScheduleListItem
                    key={s.id} schedule={s}
                    onJoin={handleJoinSchedule}
                    onLeave={handleLeaveSchedule}
                    loading={actionLoading}
                  />
                ))}

                {schedules.filter(s => !s.joined).length > 0 && (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 pt-3">
                    Available Schedules
                  </p>
                )}
                {schedules.filter(s => !s.joined).map(s => (
                  <ScheduleListItem
                    key={s.id} schedule={s}
                    onJoin={handleJoinSchedule}
                    onLeave={handleLeaveSchedule}
                    loading={actionLoading}
                  />
                ))}
              </>
            )}
          </>
        )}

        {tab === 'matches' && (
          <>
            {matches.length === 0 ? (
              <Card className="p-8 text-center">
                <History size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No completed matches yet</p>
              </Card>
            ) : (
              matches.map(m => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <CategoryBadge category={m.category} />
                    <div className="text-xs text-gray-400">
                      <MapPin size={10} className="inline mr-0.5" />
                      {m.court} · {formatMatchTime(m.startTime)}
                    </div>
                  </div>

                  {/* Result badge */}
                  <div className="mb-3">
                    {m.won && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <Trophy size={10} /> Won
                      </span>
                    )}
                    {m.lost && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        Lost
                      </span>
                    )}
                    {!m.won && !m.lost && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700">
                        No result
                      </span>
                    )}
                  </div>

                  <div className="text-sm">
                    {m.partner[0] && (
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="text-xs text-gray-400">Partner:</span>{' '}
                        <strong className="text-gray-800 dark:text-gray-200">{m.partner[0].name}</strong>
                        <span className="text-xs text-gray-400 ml-1">({m.partner[0].rank})</span>
                      </p>
                    )}
                    {m.opponents.length > 0 && (
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        <span className="text-xs text-gray-400">vs:</span>{' '}
                        {m.opponents.map(o => `${o.name} (${o.rank})`).join(', ')}
                      </p>
                    )}
                  </div>
                </Card>
              ))
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium shadow-2xl animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      {children ?? <span className="font-medium text-gray-800 dark:text-gray-200">{value}</span>}
    </div>
  );
}

function rankLabel(r: Rank): string {
  return { A: 'Pro', B: 'Advanced', C: 'Intermediate', D: 'Beginner+', E: 'Beginner' }[r];
}

function ScheduleListItem({
  schedule, onJoin, onLeave, loading,
}: {
  schedule: AvailableSchedule;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  loading: boolean;
}) {
  const start = new Date(schedule.startTime);
  const end = new Date(schedule.endTime);
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          {schedule.name && (
            <p className="text-xs text-gray-400">{schedule.name}</p>
          )}
          <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2 truncate">
            <MapPin size={14} className="text-brand-500 flex-shrink-0" />
            {schedule.courtName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 ml-5">
            <Phone size={10} /> {schedule.courtContact}
          </p>
        </div>
        {schedule.joined && (
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 flex-shrink-0">
            <Check size={12} /> JOINED
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3 ml-5">
        <div className="flex items-center gap-1.5"><Calendar size={11} /> {format(start, 'MMM d')}</div>
        <div className="flex items-center gap-1.5"><Clock size={11} /> {format(start, 'HH:mm')} – {format(end, 'HH:mm')}</div>
        <div className="flex items-center gap-1.5 col-span-2 text-gray-400">
          by {schedule.qmaster.name} · {schedule._count.queueEntries} joined
        </div>
      </div>

      {schedule.joined ? (
        <button
          onClick={() => onLeave(schedule.id)} disabled={loading}
          className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-200 disabled:opacity-50"
        >
          Leave Schedule
        </button>
      ) : (
        <button
          onClick={() => onJoin(schedule.id)} disabled={loading}
          className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50"
        >
          Join Schedule
        </button>
      )}
    </Card>
  );
}
