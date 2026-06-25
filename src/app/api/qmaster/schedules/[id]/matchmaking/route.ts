import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionQMasterId } from '@/lib/auth';
import { RANK_VALUES, MATCHMAKING_WEIGHTS, RECENT_MATCH_LOOKBACK } from '@/lib/constants';
import type { Rank, Gender, MatchCategory } from '@/types';

interface SchedulePlayer {
  id: string;
  name: string;
  rank: Rank;
  gender: Gender;
  preferredCategories: MatchCategory[];
  gamesPlayed: number;
  joinedAt: Date;
  recentPartnerIds: string[];
  recentOpponentIds: string[];
}

function rankValue(r: Rank) { return RANK_VALUES[r]; }
function teamStrength(t: SchedulePlayer[]) { return t.reduce((s, p) => s + rankValue(p.rank), 0); }
function waitMinutes(p: SchedulePlayer) { return (Date.now() - p.joinedAt.getTime()) / 60_000; }

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [h, ...t] = arr;
  return [...combinations(t, k - 1).map(c => [h, ...c]), ...combinations(t, k)];
}

function teamSplits(four: SchedulePlayer[], cat: MatchCategory): [SchedulePlayer[], SchedulePlayer[]][] {
  if (cat === 'MixedDoubles') {
    const males = four.filter(p => p.gender === 'Male');
    const females = four.filter(p => p.gender === 'Female');
    if (males.length !== 2 || females.length !== 2) return [];
    return [
      [[males[0], females[0]], [males[1], females[1]]],
      [[males[0], females[1]], [males[1], females[0]]],
    ];
  }
  const [a, b, c, d] = four;
  return [[[a, b], [c, d]], [[a, c], [b, d]], [[a, d], [b, c]]];
}

function isEligible(p: SchedulePlayer, cat: MatchCategory) {
  if (!p.preferredCategories.includes(cat)) return false;
  if (cat === 'MensDoubles') return p.gender === 'Male';
  if (cat === 'WomensDoubles') return p.gender === 'Female';
  return true;
}

function scoreMatch(t1: SchedulePlayer[], t2: SchedulePlayer[]): number {
  const diff = Math.abs(teamStrength(t1) - teamStrength(t2));
  let score = diff * MATCHMAKING_WEIGHTS.TEAM_DIFF;

  const penalizePartners = (t: SchedulePlayer[]) => {
    if (t[0].recentPartnerIds.includes(t[1].id)) score += MATCHMAKING_WEIGHTS.REPEAT_PARTNER;
    if (t[1].recentPartnerIds.includes(t[0].id)) score += MATCHMAKING_WEIGHTS.REPEAT_PARTNER;
  };
  penalizePartners(t1); penalizePartners(t2);

  for (const a of t1) for (const b of t2) {
    if (a.recentOpponentIds.includes(b.id)) score += MATCHMAKING_WEIGHTS.REPEAT_OPPONENT;
  }

  const all = [...t1, ...t2];
  const avgWait = all.reduce((s, p) => s + waitMinutes(p), 0) / 4;
  score -= avgWait * MATCHMAKING_WEIGHTS.WAITING_BONUS_PER_MIN;

  const avgGames = all.reduce((s, p) => s + p.gamesPlayed, 0) / 4;
  score += avgGames * MATCHMAKING_WEIGHTS.GAMES_PLAYED;
  return score;
}

// POST /api/qmaster/schedules/[id]/matchmaking — create the next match for this schedule
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const schedule = await prisma.schedule.findUnique({ where: { id: params.id } });
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  if (schedule.qmasterId !== qmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Session active check
  const now = new Date();
  if (now < schedule.startTime || now > schedule.endTime) {
    return NextResponse.json(
      { error: `Schedule is not active. Runs ${schedule.startTime.toISOString()} – ${schedule.endTime.toISOString()}` },
      { status: 400 }
    );
  }

  // Only one active match per schedule at a time
  const activeMatch = await prisma.match.findFirst({
    where: { scheduleId: schedule.id, status: 'Playing' },
  });
  if (activeMatch) {
    return NextResponse.json(
      { error: 'A match is already in progress on this court. End it first.' },
      { status: 409 }
    );
  }

  // Load eligible players from this schedule's queue (must not be currently Playing in any other match)
  const entries = await prisma.scheduleQueueEntry.findMany({
    where: { scheduleId: schedule.id, player: { status: { not: 'Playing' } } },
    include: { player: true },
    orderBy: { joinedAt: 'asc' },
  });

  if (entries.length < 4) {
    return NextResponse.json(
      { error: `Only ${entries.length} player(s) available. Need at least 4.` },
      { status: 400 }
    );
  }

  // Load recent partners/opponents for each player (from prior matches in this schedule)
  const players: SchedulePlayer[] = [];
  for (const e of entries) {
    const recent = await prisma.matchPlayer.findMany({
      where: { playerId: e.playerId, match: { status: 'Completed', scheduleId: schedule.id } },
      include: { match: { include: { players: true } } },
      orderBy: { match: { endTime: 'desc' } },
      take: RECENT_MATCH_LOOKBACK,
    });
    const partners: string[] = []; const opponents: string[] = [];
    for (const mp of recent) {
      for (const other of mp.match.players) {
        if (other.playerId === e.playerId) continue;
        (other.team === mp.team ? partners : opponents).push(other.playerId);
      }
    }
    players.push({
      id: e.playerId,
      name: e.player.name,
      rank: e.player.rank as Rank,
      gender: e.player.gender as Gender,
      preferredCategories: Array.isArray(e.player.preferredCategories)
        ? (e.player.preferredCategories as MatchCategory[]) : [],
      gamesPlayed: e.player.gamesPlayed,
      joinedAt: e.joinedAt,
      recentPartnerIds: partners,
      recentOpponentIds: opponents,
    });
  }

  // Find best match across all categories
  let best: { t1: SchedulePlayer[]; t2: SchedulePlayer[]; cat: MatchCategory; score: number } | null = null;

  for (const cat of ['MensDoubles', 'WomensDoubles', 'MixedDoubles'] as MatchCategory[]) {
    const eligible = players.filter(p => isEligible(p, cat));
    let groups: SchedulePlayer[][];
    if (cat === 'MixedDoubles') {
      const m = eligible.filter(p => p.gender === 'Male');
      const f = eligible.filter(p => p.gender === 'Female');
      if (m.length < 2 || f.length < 2) continue;
      groups = combinations(m, 2).flatMap(mc => combinations(f, 2).map(fc => [...mc, ...fc]));
    } else {
      if (eligible.length < 4) continue;
      groups = combinations(eligible, 4);
    }
    for (const g of groups) {
      for (const [t1, t2] of teamSplits(g, cat)) {
        const s = scoreMatch(t1, t2);
        if (!best || s < best.score) best = { t1, t2, cat, score: s };
      }
    }
  }

  if (!best) {
    return NextResponse.json(
      { error: 'Could not form a valid match. Players don\'t share a common category or gender mix.' },
      { status: 400 }
    );
  }

  // Create the match
  const allPlayers = [...best.t1, ...best.t2];
  const match = await prisma.$transaction(async tx => {
    const m = await tx.match.create({
      data: {
        scheduleId: schedule.id,
        category: best!.cat,
        status: 'Playing',
        players: {
          create: [
            { playerId: best!.t1[0].id, team: 1 },
            { playerId: best!.t1[1].id, team: 1 },
            { playerId: best!.t2[0].id, team: 2 },
            { playerId: best!.t2[1].id, team: 2 },
          ],
        },
      },
    });
    for (const p of allPlayers) {
      await tx.player.update({
        where: { id: p.id },
        data: { status: 'Playing', gamesPlayed: { increment: 1 }, waitingStartTime: null },
      });
    }
    return m;
  });

  global.io?.emit('schedule:update');
  global.io?.emit('match:created');

  return NextResponse.json({
    ok: true,
    match,
    team1: best.t1.map(p => ({ id: p.id, name: p.name, rank: p.rank })),
    team2: best.t2.map(p => ({ id: p.id, name: p.name, rank: p.rank })),
    category: best.cat,
  }, { status: 201 });
}

// PUT — end the current active match for this schedule
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const winningTeam: number | null = body?.winningTeam ?? null;

  const schedule = await prisma.schedule.findUnique({ where: { id: params.id } });
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  if (schedule.qmasterId !== qmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const match = await prisma.match.findFirst({
    where: { scheduleId: schedule.id, status: 'Playing' },
    include: { players: true },
  });
  if (!match) return NextResponse.json({ error: 'No active match on this schedule' }, { status: 404 });

  await prisma.$transaction(async tx => {
    await tx.match.update({
      where: { id: match.id },
      data: { status: 'Completed', winningTeam, endTime: new Date() },
    });
    for (const mp of match.players) {
      const isWinner = mp.team === winningTeam;
      await tx.player.update({
        where: { id: mp.playerId },
        data: {
          status: 'Offline', // player can re-join schedule queue if they want another game
          waitingStartTime: null,
          ...(isWinner ? { totalWins: { increment: 1 } } : {}),
        },
      });
    }
  });

  global.io?.emit('schedule:update');
  global.io?.emit('match:ended');
  return NextResponse.json({ ok: true });
}
