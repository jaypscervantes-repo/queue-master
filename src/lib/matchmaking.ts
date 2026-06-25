import { prisma } from './prisma';
import { RANK_VALUES, MATCHMAKING_WEIGHTS, RECENT_MATCH_LOOKBACK } from './constants';
import type { Rank, Gender, MatchCategory, PlayerData, MatchCandidate } from '@/types';

// ─── Core scoring helpers ───────────────────────────────────────────────────

function rankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

function teamStrength(players: PlayerData[]): number {
  return players.reduce((s, p) => s + rankValue(p.rank), 0);
}

function waitMinutes(p: PlayerData): number {
  return (Date.now() - p.waitingStartTime.getTime()) / 60_000;
}

function scoreMatchConfig(team1: PlayerData[], team2: PlayerData[]): number {
  const diff = Math.abs(teamStrength(team1) - teamStrength(team2));
  let score = diff * MATCHMAKING_WEIGHTS.TEAM_DIFF;

  // Repeat partner penalty — check both teams
  const penalizePartners = (team: PlayerData[]) => {
    if (team[0].recentPartnerIds.includes(team[1].id)) score += MATCHMAKING_WEIGHTS.REPEAT_PARTNER;
    if (team[1].recentPartnerIds.includes(team[0].id)) score += MATCHMAKING_WEIGHTS.REPEAT_PARTNER;
  };
  penalizePartners(team1);
  penalizePartners(team2);

  // Repeat opponent penalty
  for (const p1 of team1) {
    for (const p2 of team2) {
      if (p1.recentOpponentIds.includes(p2.id)) score += MATCHMAKING_WEIGHTS.REPEAT_OPPONENT;
    }
  }

  // Waiting priority — longer wait reduces score (higher priority)
  const allPlayers = [...team1, ...team2];
  const avgWait = allPlayers.reduce((s, p) => s + waitMinutes(p), 0) / 4;
  score -= avgWait * MATCHMAKING_WEIGHTS.WAITING_BONUS_PER_MIN;

  // Games played — prefer players who played less
  const avgGames = allPlayers.reduce((s, p) => s + p.gamesPlayed, 0) / 4;
  score += avgGames * MATCHMAKING_WEIGHTS.GAMES_PLAYED;

  return score;
}

// ─── Combination utilities ──────────────────────────────────────────────────

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...tail] = arr;
  return [
    ...combinations(tail, k - 1).map(c => [head, ...c]),
    ...combinations(tail, k),
  ];
}

function teamSplits(players: PlayerData[], category: MatchCategory): [PlayerData[], PlayerData[]][] {
  if (category === 'MixedDoubles') {
    const males = players.filter(p => p.gender === 'Male');
    const females = players.filter(p => p.gender === 'Female');
    if (males.length !== 2 || females.length !== 2) return [];
    return [
      [[males[0], females[0]], [males[1], females[1]]],
      [[males[0], females[1]], [males[1], females[0]]],
    ];
  }
  // Same-gender: 3 unique splits of 4 players
  const [p1, p2, p3, p4] = players;
  return [
    [[p1, p2], [p3, p4]],
    [[p1, p3], [p2, p4]],
    [[p1, p4], [p2, p3]],
  ];
}

function isEligible(player: PlayerData, category: MatchCategory): boolean {
  if (!player.preferredCategories.includes(category)) return false;
  if (category === 'MensDoubles') return player.gender === 'Male';
  if (category === 'WomensDoubles') return player.gender === 'Female';
  return true; // MixedDoubles — both genders
}

// ─── Player history loader ──────────────────────────────────────────────────

async function loadPlayerData(queueEntries: {
  playerId: string;
  queuedAt: Date;
  player: {
    id: string;
    name: string;
    rank: string;
    gender: string;
    preferredCategories: unknown;
    gamesPlayed: number;
  };
}[]): Promise<PlayerData[]> {
  const result: PlayerData[] = [];

  for (const entry of queueEntries) {
    const { player, queuedAt } = entry;

    const recentMatchPlayers = await prisma.matchPlayer.findMany({
      where: {
        playerId: player.id,
        match: { status: 'Completed' },
      },
      include: {
        match: {
          include: { players: true },
        },
      },
      orderBy: { match: { endTime: 'desc' } },
      take: RECENT_MATCH_LOOKBACK,
    });

    const recentPartnerIds: string[] = [];
    const recentOpponentIds: string[] = [];

    for (const mp of recentMatchPlayers) {
      const myTeam = mp.team;
      for (const other of mp.match.players) {
        if (other.playerId === player.id) continue;
        if (other.team === myTeam) {
          recentPartnerIds.push(other.playerId);
        } else {
          recentOpponentIds.push(other.playerId);
        }
      }
    }

    const cats = Array.isArray(player.preferredCategories)
      ? (player.preferredCategories as MatchCategory[])
      : [];

    result.push({
      id: player.id,
      name: player.name,
      rank: player.rank as Rank,
      gender: player.gender as Gender,
      preferredCategories: cats,
      gamesPlayed: player.gamesPlayed,
      waitingStartTime: queuedAt,
      recentPartnerIds,
      recentOpponentIds,
    });
  }

  return result;
}

// ─── Best match finder per category ────────────────────────────────────────

function findBestForCategory(
  players: PlayerData[],
  category: MatchCategory,
  excludeIds: Set<string>
): MatchCandidate | null {
  const eligible = players.filter(
    p => !excludeIds.has(p.id) && isEligible(p, category)
  );

  let candidateGroups: PlayerData[][];

  if (category === 'MixedDoubles') {
    const males = eligible.filter(p => p.gender === 'Male');
    const females = eligible.filter(p => p.gender === 'Female');
    if (males.length < 2 || females.length < 2) return null;
    candidateGroups = combinations(males, 2).flatMap(mc =>
      combinations(females, 2).map(fc => [...mc, ...fc])
    );
  } else {
    if (eligible.length < 4) return null;
    candidateGroups = combinations(eligible, 4);
  }

  let best: MatchCandidate | null = null;

  for (const group of candidateGroups) {
    const splits = teamSplits(group, category);
    for (const [team1, team2] of splits) {
      const score = scoreMatchConfig(team1, team2);
      if (!best || score < best.score) {
        best = { team1, team2, category, score };
      }
    }
  }

  return best;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface MatchmakingResult {
  courtId: string;
  candidate: MatchCandidate;
}

export interface MatchmakingDiagnostic {
  results: MatchmakingResult[];
  queueCount: number;
  availableCourtCount: number;
  reason?: string; // populated when no matches could be formed
}

export async function runMatchmaking(): Promise<MatchmakingDiagnostic> {
  const [queueEntries, availableCourts] = await Promise.all([
    prisma.queueEntry.findMany({
      include: { player: true },
      orderBy: { queuedAt: 'asc' },
    }),
    prisma.court.findMany({
      where: { status: 'Available', active: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const queueCount = queueEntries.length;
  const availableCourtCount = availableCourts.length;

  if (queueCount === 0) {
    return { results: [], queueCount, availableCourtCount, reason: 'No players are in the queue.' };
  }
  if (queueCount < 4) {
    return {
      results: [],
      queueCount,
      availableCourtCount,
      reason: `4 or more players are needed to matchmake. Currently only ${queueCount} player${queueCount === 1 ? '' : 's'} in queue.`,
    };
  }
  if (availableCourtCount === 0) {
    return {
      results: [],
      queueCount,
      availableCourtCount,
      reason: 'No courts are available. End an ongoing match or add a new court.',
    };
  }

  const allPlayers = await loadPlayerData(queueEntries as Parameters<typeof loadPlayerData>[0]);
  const results: MatchmakingResult[] = [];
  const usedIds = new Set<string>();

  for (const court of availableCourts) {
    const candidates: MatchCandidate[] = [];

    for (const cat of ['MensDoubles', 'WomensDoubles', 'MixedDoubles'] as MatchCategory[]) {
      const c = findBestForCategory(allPlayers, cat, usedIds);
      if (c) candidates.push(c);
    }

    if (candidates.length === 0) break;

    candidates.sort((a, b) => a.score - b.score);
    const chosen = candidates[0];

    results.push({ courtId: court.id, candidate: chosen });

    for (const p of [...chosen.team1, ...chosen.team2]) {
      usedIds.add(p.id);
    }
  }

  if (results.length === 0) {
    return {
      results: [],
      queueCount,
      availableCourtCount,
      reason:
        "Could not form a valid match. Players don't share enough categories or genders for a doubles match — check that at least 4 players have a common preferred category (Men's Doubles needs 4 males, Women's needs 4 females, Mixed needs 2 of each).",
    };
  }

  return { results, queueCount, availableCourtCount };
}

export async function executeMatches(results: MatchmakingResult[]): Promise<void> {
  for (const { courtId, candidate } of results) {
    const { team1, team2, category } = candidate;
    const allPlayers = [...team1, ...team2];

    await prisma.$transaction(async tx => {
      // Create match record
      await tx.match.create({
        data: {
          courtId,
          category,
          status: 'Playing',
          players: {
            create: [
              { playerId: team1[0].id, team: 1 },
              { playerId: team1[1].id, team: 1 },
              { playerId: team2[0].id, team: 2 },
              { playerId: team2[1].id, team: 2 },
            ],
          },
        },
      });

      // Mark court occupied
      await tx.court.update({
        where: { id: courtId },
        data: { status: 'Occupied' },
      });

      // Remove from queue, update player status and stats
      for (const player of allPlayers) {
        await tx.queueEntry.deleteMany({ where: { playerId: player.id } });
        await tx.player.update({
          where: { id: player.id },
          data: {
            status: 'Playing',
            gamesPlayed: { increment: 1 },
            waitingStartTime: null,
          },
        });
      }
    });
  }
}

export async function endMatch(
  matchId: string,
  winningTeam: number | null
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { players: { include: { player: true } } },
  });
  if (!match) throw new Error('Match not found');

  await prisma.$transaction(async tx => {
    await tx.match.update({
      where: { id: matchId },
      data: {
        status: 'Completed',
        winningTeam,
        endTime: new Date(),
      },
    });

    // Free the court (only for global matches; schedule-scoped matches have no Court row)
    if (match.courtId) {
      await tx.court.update({
        where: { id: match.courtId },
        data: { status: 'Available' },
      });
    }

    // Compute current queue length once so we can append new entries in order
    let queuePos = await tx.queueEntry.count();

    for (const mp of match.players) {
      const isWinner = mp.team === winningTeam;
      const player = mp.player;

      if (player.autoRequeue) {
        // Auto-requeue: back into the queue at the end
        queuePos += 1;
        const now = new Date();
        await tx.queueEntry.create({
          data: {
            playerId: mp.playerId,
            position: queuePos,
            queuedAt: now,
          },
        });
        await tx.player.update({
          where: { id: mp.playerId },
          data: {
            status: 'Queued',
            waitingStartTime: now,
            ...(isWinner ? { totalWins: { increment: 1 } } : {}),
          },
        });
      } else {
        // Player opted out — go Offline and reset the flag for next time
        await tx.player.update({
          where: { id: mp.playerId },
          data: {
            status: 'Offline',
            waitingStartTime: null,
            autoRequeue: true,
            ...(isWinner ? { totalWins: { increment: 1 } } : {}),
          },
        });
      }
    }
  });
}
