'use client';

import { useState, useCallback } from 'react';
import type { Player, QueueEntry, Court, Match, DashboardStats } from '@/types';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useQueue() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetcher<QueueEntry[]>('/api/queue');
      setQueue(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { queue, setQueue, loading, refresh };
}

export function useCourts() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetcher<Court[]>('/api/courts');
      setCourts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { courts, setCourts, loading, refresh };
}

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetcher<Player[]>('/api/players');
      setPlayers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { players, setPlayers, loading, refresh };
}

export function useMatches(status?: string) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const url = `/api/matches?limit=20&page=${page}${status ? `&status=${status}` : ''}`;
      const data = await fetcher<{ matches: Match[]; total: number }>(url);
      setMatches(data.matches);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [status]);

  return { matches, total, loading, refresh };
}

export function useStats(queue: QueueEntry[], courts: Court[]): DashboardStats {
  const totalQueued = queue.length;
  const activeCourts = courts.filter(c => c.status === 'Occupied').length;
  const playingNow = courts.reduce((sum, c) => {
    return sum + (c.currentMatch ? c.currentMatch.players.length : 0);
  }, 0);
  const waitingPlayers = totalQueued;

  const avgWaitMinutes =
    queue.length > 0
      ? Math.round(
          queue.reduce((sum, e) => {
            const wait = e.player?.waitingStartTime
              ? (Date.now() - new Date(e.player.waitingStartTime).getTime()) / 60_000
              : 0;
            return sum + wait;
          }, 0) / queue.length
        )
      : 0;

  return { totalQueued, activeCourts, playingNow, waitingPlayers, avgWaitMinutes };
}
