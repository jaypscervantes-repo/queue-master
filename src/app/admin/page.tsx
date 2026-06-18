'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/Header';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { NavTabs, type Tab } from '@/components/dashboard/NavTabs';
import { QueueList } from '@/components/queue/QueueList';
import { CourtsList } from '@/components/courts/CourtsList';
import { MatchHistory } from '@/components/matches/MatchHistory';
import { PlayersList } from '@/components/players/PlayersList';
import { Analytics } from '@/components/analytics/Analytics';
import { PlayerModal } from '@/components/players/PlayerModal';
import { QRCodeDisplay } from '@/components/qr/QRCodeDisplay';
import { NextUpCard } from '@/components/dashboard/NextUpCard';
import { SessionInfo } from '@/components/dashboard/SessionInfo';
import { SessionSettingsModal } from '@/components/dashboard/SessionSettingsModal';
import { ActiveCourtsModal, PlayingNowModal } from '@/components/dashboard/StatDetailModals';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { Settings } from '@/types';
import { isSessionActive } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';
import { useQueue, useCourts, usePlayers, useMatches, useStats } from '@/hooks/useData';
import type { Player, Gender, Rank, MatchCategory } from '@/types';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('queue');
  const [dark, setDark] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [matchmakingLoading, setMatchmakingLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeCourtsOpen, setActiveCourtsOpen] = useState(false);
  const [playingNowOpen, setPlayingNowOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0); // bumps to refresh NextUpCard

  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setSettings(await res.json());
    } catch {}
  };

  const { queue, loading: queueLoading, refresh: refreshQueue } = useQueue();
  const { courts, loading: courtsLoading, refresh: refreshCourts } = useCourts();
  const { players, loading: playersLoading, refresh: refreshPlayers } = usePlayers();
  const { matches, total: matchTotal, loading: matchesLoading, refresh: refreshMatches } = useMatches();
  const stats = useStats(queue, courts);

  // Dark mode
  useEffect(() => {
    const stored = localStorage.getItem('dark');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored ? stored === 'true' : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('dark', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  // Initial data load
  useEffect(() => {
    refreshQueue();
    refreshCourts();
    refreshPlayers();
    refreshMatches(1);
    refreshSettings();
  }, []);

  // Bump preview key whenever queue/courts change so NextUpCard refreshes
  useEffect(() => {
    setPreviewKey(k => k + 1);
  }, [queue.length, courts.map(c => c.status).join('|')]);

  // Socket.IO real-time updates
  useSocket({
    'queue:update': () => { refreshQueue(); refreshPlayers(); },
    'court:update': () => refreshCourts(),
    'match:created': () => { refreshQueue(); refreshCourts(); refreshPlayers(); refreshMatches(1); },
    'match:ended': () => { refreshCourts(); refreshPlayers(); refreshMatches(1); },
    'player:update': () => refreshPlayers(),
    'stats:update': () => { refreshQueue(); refreshCourts(); },
    'settings:update': () => refreshSettings(),
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Matchmaking
  const handleRunMatchmaking = async () => {
    // Block when no active session
    if (!isSessionActive(settings?.sessionStart, settings?.sessionEnd)) {
      setErrorDialog({
        title: 'No Active Session',
        message:
          'You can\'t start a match outside of an active session. Click the banner at the top to set a session schedule. You can still add players to the queue.',
      });
      return;
    }

    // Client-side pre-checks for instant feedback
    if (queue.length === 0) {
      setErrorDialog({
        title: 'No Players in Queue',
        message: 'No players are in the queue. Add players or have them scan the QR code to join.',
      });
      return;
    }
    if (queue.length < 4) {
      setErrorDialog({
        title: 'Not Enough Players',
        message: `4 or more players are needed to matchmake. Currently only ${queue.length} player${queue.length === 1 ? '' : 's'} in queue.`,
      });
      return;
    }

    setMatchmakingLoading(true);
    try {
      const res = await fetch('/api/matchmaking', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        // Server returned a specific reason (e.g. category/gender mismatch, no courts)
        setErrorDialog({
          title: 'Cannot Form a Match',
          message: data.reason ?? data.error ?? 'Matchmaking failed.',
        });
        return;
      }
      showToast(data.message);
    } catch (e: any) {
      setErrorDialog({
        title: 'Matchmaking Failed',
        message: e?.message ?? 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setMatchmakingLoading(false);
    }
  };

  // Queue actions
  const handleRemoveFromQueue = async (playerId: string) => {
    await fetch(`/api/queue/${playerId}`, { method: 'DELETE' });
    refreshQueue();
    refreshPlayers();
  };

  const handleJoinQueue = async (playerId: string) => {
    const res = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) {
      const d = await res.json();
      showToast(d.error, 'error');
    } else {
      showToast('Player added to queue');
      refreshQueue();
      refreshPlayers();
    }
  };

  // Player modal submit
  const handlePlayerSubmit = async (data: {
    name: string;
    gender: Gender;
    rank: Rank;
    preferredCategories: MatchCategory[];
  }) => {
    if (editPlayer) {
      // Update existing
      const res = await fetch(`/api/players/${editPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Player updated');
      refreshPlayers();
    } else {
      // Register new and join queue
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Player registered and added to queue');
      refreshQueue();
      refreshPlayers();
    }
    setEditPlayer(null);
  };

  const handleEditPlayer = (player: Player) => {
    setEditPlayer(player);
    setPlayerModalOpen(true);
  };

  const handleAddPlayer = () => {
    setEditPlayer(null);
    setPlayerModalOpen(true);
  };

  const handleLeaveForTheDay = async (player: Player) => {
    const res = await fetch(`/api/players/${player.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leaveForTheDay' }),
    });
    if (!res.ok) {
      showToast('Failed to update player', 'error');
      return;
    }
    showToast(
      player.status === 'Playing'
        ? `${player.name} will leave after this match`
        : `${player.name} is done for the day`
    );
    refreshQueue();
    refreshPlayers();
  };

  const handleDeactivate = async (playerId: string) => {
    await fetch(`/api/players/${playerId}`, { method: 'DELETE' });
    refreshQueue();
    refreshPlayers();
  };

  // Court actions
  const handleEndMatch = async (matchId: string, winningTeam: number | null) => {
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end', winningTeam }),
    });
    if (!res.ok) {
      showToast('Failed to end match', 'error');
    } else {
      showToast('Match ended');
      refreshCourts();
      refreshPlayers();
      refreshMatches(1);
    }
  };

  const handleAddCourt = async (name: string) => {
    const res = await fetch('/api/courts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const d = await res.json();
      showToast(d.error, 'error');
    } else {
      showToast(`${name} added`);
      refreshCourts();
    }
  };

  const handleRemoveCourt = async (courtId: string) => {
    const res = await fetch(`/api/courts/${courtId}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      showToast(d.error, 'error');
    } else {
      showToast('Court removed');
      refreshCourts();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header dark={dark} onToggleDark={toggleDark} onShowQR={() => setQrOpen(true)} />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <SessionInfo settings={settings} onEdit={() => setSettingsOpen(true)} />

        <StatsCards
          stats={stats}
          onActiveCourtsClick={() => setActiveCourtsOpen(true)}
          onPlayingNowClick={() => setPlayingNowOpen(true)}
        />

        <NextUpCard
          courts={courts}
          avgMatchDuration={settings?.avgMatchDuration ?? 15}
          refreshKey={previewKey}
        />

        <NavTabs active={activeTab} onChange={setActiveTab} />

        <Card className="p-6">
          {activeTab === 'queue' && (
            <QueueList
              queue={queue}
              loading={queueLoading}
              onAddPlayer={handleAddPlayer}
              onRunMatchmaking={handleRunMatchmaking}
              onRemoveFromQueue={handleRemoveFromQueue}
              matchmakingLoading={matchmakingLoading}
              availableCourtCount={courts.filter(c => c.status === 'Available').length}
              avgMatchDuration={settings?.avgMatchDuration ?? 15}
            />
          )}

          {activeTab === 'courts' && (
            <CourtsList
              courts={courts}
              onEndMatch={handleEndMatch}
              onRunMatchmaking={handleRunMatchmaking}
              onAddCourt={handleAddCourt}
              onRemoveCourt={handleRemoveCourt}
              matchmakingLoading={matchmakingLoading}
            />
          )}

          {activeTab === 'history' && (
            <MatchHistory
              matches={matches}
              total={matchTotal}
              loading={matchesLoading}
              onLoadMore={refreshMatches}
            />
          )}

          {activeTab === 'players' && (
            <PlayersList
              players={players.filter(p => p.active)}
              loading={playersLoading}
              onAddPlayer={handleAddPlayer}
              onEditPlayer={handleEditPlayer}
              onJoinQueue={handleJoinQueue}
              onLeaveForTheDay={handleLeaveForTheDay}
              onDeactivate={handleDeactivate}
            />
          )}

          {activeTab === 'analytics' && <Analytics />}
        </Card>
      </main>

      {/* Modals */}
      <PlayerModal
        open={playerModalOpen}
        onClose={() => { setPlayerModalOpen(false); setEditPlayer(null); }}
        onSubmit={handlePlayerSubmit}
        initial={editPlayer}
        title={editPlayer ? 'Edit Player' : 'Register Player'}
      />

      <QRCodeDisplay open={qrOpen} onClose={() => setQrOpen(false)} />

      <SessionSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaved={s => { setSettings(s); showToast('Schedule saved'); }}
      />

      <ActiveCourtsModal
        open={activeCourtsOpen}
        onClose={() => setActiveCourtsOpen(false)}
        courts={courts}
      />

      <PlayingNowModal
        open={playingNowOpen}
        onClose={() => setPlayingNowOpen(false)}
        courts={courts}
      />

      {/* Error dialog */}
      <Dialog
        open={errorDialog !== null}
        onClose={() => setErrorDialog(null)}
        title={errorDialog?.title ?? ''}
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <AlertTriangle size={28} className="text-orange-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {errorDialog?.message}
          </p>
          <Button onClick={() => setErrorDialog(null)} className="w-full">
            Got it
          </Button>
        </div>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up ${
            toast.type === 'success'
              ? 'bg-brand-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}
    </div>
  );
}
