'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, MapPin, Phone, Users, X, Clock,
  Play, Trophy, Swords, AlertCircle, History, UserPlus, ListOrdered,
  Search, Plus,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RankBadge, StatusBadge, CategoryBadge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { useSocket } from '@/hooks/useSocket';
import { formatMatchTime, formatMatchDuration, getPlayersByTeam } from '@/lib/utils';
import type { Rank, PlayerStatus, MatchCategory, Player, Match } from '@/types';

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

type Tab = 'queue' | 'history' | 'players';

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
  const [playerSearch, setPlayerSearch] = useState('');

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
        } else {
          setActiveMatch(null);
        }
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
  });

  const removePlayer = async (playerId: string) => {
    if (!confirm('Remove this player from the schedule?')) return;
    await fetch(`/api/qmaster/schedules/${params.id}/queue/${playerId}`, { method: 'DELETE' });
    refresh();
  };

  const addPlayer = async (playerId: string) => {
    setActionLoading(true); setError(null);
    try {
      const res = await fetch(`/api/qmaster/schedules/${params.id}/queue/${playerId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not add'); return; }
      refresh();
    } finally { setActionLoading(false); }
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
  const queuedIds = new Set(schedule.queueEntries.map(e => e.player.id));
  const filteredPlayers = allPlayers.filter(p => {
    if (queuedIds.has(p.id)) return false;
    if (playerSearch && !p.name.toLowerCase().includes(playerSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      {/* Header */}
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

      {/* Stats summary — overlapping gradient */}
      <div className="px-4 -mt-10">
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Players Queued" value={schedule.queueEntries.length} accent="text-brand-500" />
            <Stat label="Matches Played" value={pastMatches.length} accent="text-purple-500" />
            <Stat label="Court Status" value={activeMatch ? 'Busy' : 'Open'} accent={activeMatch ? 'text-blue-500' : 'text-brand-500'} small />
          </div>
        </Card>
      </div>

      {/* Active match or run matchmaking — always visible */}
      <div className="px-4 space-y-3 mt-3">
        {activeMatch ? (
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
              <Button size="sm" variant="secondary" loading={actionLoading} onClick={() => endMatch(null)}>End</Button>
              <Button size="sm" variant="outline" loading={actionLoading} onClick={() => endMatch(2)}>
                <Trophy size={13} /> T2 Won
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
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
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <TabButton id="queue" current={tab} onClick={setTab} icon={ListOrdered}>
            Queue ({schedule.queueEntries.length})
          </TabButton>
          <TabButton id="history" current={tab} onClick={setTab} icon={History}>
            History ({pastMatches.length})
          </TabButton>
          <TabButton id="players" current={tab} onClick={setTab} icon={UserPlus}>
            Add Players
          </TabButton>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 mt-3 space-y-2">
        {tab === 'queue' && (
          <>
            {schedule.queueEntries.length === 0 ? (
              <Card className="p-8 text-center">
                <Users size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No players in queue</p>
                <p className="text-xs text-gray-400 mt-1">Use "Add Players" tab or share your portal link</p>
              </Card>
            ) : (
              schedule.queueEntries.map((entry, idx) => (
                <Card key={entry.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-gray-400 flex-shrink-0">{idx + 1}</span>
                    <RankBadge rank={entry.player.rank} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{entry.player.name}</p>
                      <p className="text-xs text-gray-400">
                        Joined {formatDistanceToNow(new Date(entry.joinedAt), { addSuffix: true })} ·
                        {' '}{entry.player.gamesPlayed} games · {entry.player.totalWins} wins
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
                </Card>
              ))
            )}
          </>
        )}

        {tab === 'history' && (
          <>
            {pastMatches.length === 0 ? (
              <Card className="p-8 text-center">
                <History size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No completed matches yet</p>
              </Card>
            ) : (
              pastMatches.map(m => {
                const team1 = getPlayersByTeam(m.players, 1);
                const team2 = getPlayersByTeam(m.players, 2);
                return (
                  <Card key={m.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <CategoryBadge category={m.category} />
                      <span className="text-xs text-gray-400">
                        {formatMatchTime(m.startTime)} · {formatMatchDuration(m.startTime, m.endTime)}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                      <div className="space-y-0.5">
                        <p className={`text-xs font-semibold ${m.winningTeam === 1 ? 'text-yellow-600' : 'text-gray-400'}`}>
                          {m.winningTeam === 1 && '🏆 '}Team 1
                        </p>
                        {team1.map(p => (
                          <div key={p.id} className="flex items-center gap-1.5">
                            <RankBadge rank={p.rank} />
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{p.name}</span>
                          </div>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-gray-300">VS</span>
                      <div className="space-y-0.5 text-right">
                        <p className={`text-xs font-semibold ${m.winningTeam === 2 ? 'text-yellow-600' : 'text-gray-400'}`}>
                          Team 2{m.winningTeam === 2 && ' 🏆'}
                        </p>
                        {team2.map(p => (
                          <div key={p.id} className="flex items-center gap-1.5 justify-end">
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{p.name}</span>
                            <RankBadge rank={p.rank} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </>
        )}

        {tab === 'players' && (
          <>
            <Card className="p-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)}
                  placeholder="Search players to add..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </Card>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}

            {filteredPlayers.length === 0 ? (
              <Card className="p-8 text-center">
                <Users size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {allPlayers.length === 0
                    ? 'No registered players yet'
                    : playerSearch
                      ? 'No players match your search'
                      : 'All players are already queued'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Players sign up at <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/player/signup</code>
                </p>
              </Card>
            ) : (
              filteredPlayers.map(p => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <RankBadge rank={p.rank} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">
                        {p.gender === 'Male' ? '♂' : '♀'} · {p.gamesPlayed} games · {p.totalWins} wins
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addPlayer(p.id)}
                      loading={actionLoading}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Plus size={12} /> Add
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent, small = false }: { label: string; value: string | number; accent: string; small?: boolean }) {
  return (
    <div>
      <p className={`font-bold text-gray-900 dark:text-white ${small ? 'text-lg' : 'text-2xl'} ${accent}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function TabButton({
  id, current, onClick, icon: Icon, children,
}: {
  id: Tab;
  current: Tab;
  onClick: (t: Tab) => void;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const active = current === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
        active
          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
          : 'text-gray-600 dark:text-gray-400'
      }`}
    >
      <Icon size={13} />
      {children}
    </button>
  );
}
