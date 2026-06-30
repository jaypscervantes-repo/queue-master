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

const rankValue = (r: Rank) => RANK_VALUES[r];
const teamStrength = (t: SchedulePlayer[]) => t.reduce((s, p) => s + rankValue(p.rank), 0);
const waitMinutes = (p: SchedulePlayer) => (Date.now() - p.joinedAt.getTime()) / 60_000;

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
  score -= (all.reduce((s, p) => s + waitMinutes(p), 0) / 4) * MATCHMAKING_WEIGHTS.WAITING_BONUS_PER_MIN;
  score += (all.reduce((s, p) => s + p.gamesPlayed, 0) / 4) * MATCHMAKING_WEIGHTS.GAMES_PLAYED;
  return score;
}

function findBestForCategory(players: SchedulePlayer[], cat: MatchCategory, excludeIds: Set<string>) {
  const eligible = players.filter(p => !excludeIds.has(p.id) && isEligible(p, cat));
  let groups: SchedulePlayer[][];
  if (cat === 'MixedDoubles') {
    const m = eligible.filter(p => p.gender === 'Male');
    const f = eligible.filter(p => p.gender === 'Female');
    if (m.length < 2 || f.length < 2) return null;
    groups = combinations(m, 2).flatMap(mc => combinations(f, 2).map(fc => [...mc, ...fc]));
  } else {
    if (eligible.length < 4) return null;
    groups = combinations(eligible, 4);
  }
  let best: { t1: SchedulePlayer[]; t2: SchedulePlayer[]; score: number } | null = null;
  for (const g of groups) {
    for (const [t1, t2] of teamSplits(g, cat)) {
      const s = scoreMatch(t1, t2);
      if (!best || s < best.score) best = { t1, t2, score: s };
    }
  }
  return best ? { ...best, cat } : null;
}

// POST — run matchmaking for ALL available courts in this schedule
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const schedule = await prisma.schedule.findUnique({ where: { id: params.id } });
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  if (schedule.qmasterId !== qmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  if (now < schedule.startTime || now > schedule.endTime) {
    return NextResponse.json(
      { error: `Schedule is not active. Runs ${schedule.startTime.toISOString()} – ${schedule.endTime.toISOString()}` },
      { status: 400 }
    );
  }

  const availableCourts = await prisma.court.findMany({
    where: { scheduleId: schedule.id, status: 'Available', active: true },
    orderBy: { name: 'asc' },
  });
  if (availableCourts.length === 0) {
    return NextResponse.json(
      { error: 'No available courts. End an active match or add a court first.' },
      { status: 400 }
    );
  }

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

  // Build SchedulePlayer objects with recent partner/opponent history
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
      id: e.playerId, name: e.player.name,
      rank: e.player.rank as Rank, gender: e.player.gender as Gender,
      preferredCategories: Array.isArray(e.player.preferredCategories)
        ? (e.player.preferredCategories as MatchCategory[]) : [],
      gamesPlayed: e.player.gamesPlayed, joinedAt: e.joinedAt,
      recentPartnerIds: partners, recentOpponentIds: opponents,
    });
  }

  // For each available court, pick the best match (and reserve those players)
  const created: { courtId: string; courtName: string; matchId: string; category: MatchCategory; t1: SchedulePlayer[]; t2: SchedulePlayer[] }[] = [];
  const usedIds = new Set<string>();

  for (const court of availableCourts) {
    const candidates: { t1: SchedulePlayer[]; t2: SchedulePlayer[]; cat: MatchCategory; score: number }[] = [];
    for (const cat of ['MensDoubles', 'WomensDoubles', 'MixedDoubles'] as MatchCategory[]) {
      const c = findBestForCategory(players, cat, usedIds);
      if (c) candidates.push(c);
    }
    if (candidates.length === 0) break;

    candidates.sort((a, b) => a.score - b.score);
    const chosen = candidates[0];

    const match = await prisma.$transaction(async tx => {
      const m = await tx.match.create({
        data: {
          scheduleId: schedule.id,
          courtId: court.id,
          category: chosen.cat,
          status: 'Playing',
          players: {
            create: [
              { playerId: chosen.t1[0].id, team: 1 },
              { playerId: chosen.t1[1].id, team: 1 },
              { playerId: chosen.t2[0].id, team: 2 },
              { playerId: chosen.t2[1].id, team: 2 },
            ],
          },
        },
      });
      await tx.court.update({ where: { id: court.id }, data: { status: 'Occupied' } });
      for (const p of [...chosen.t1, ...chosen.t2]) {
        await tx.player.update({
          where: { id: p.id },
          data: { status: 'Playing', gamesPlayed: { increment: 1 }, waitingStartTime: null },
        });
      }
      return m;
    });

    created.push({
      courtId: court.id, courtName: court.name, matchId: match.id,
      category: chosen.cat, t1: chosen.t1, t2: chosen.t2,
    });

    for (const p of [...chosen.t1, ...chosen.t2]) usedIds.add(p.id);
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: 'Could not form a valid match. Players don\'t share a common category or gender mix.' },
      { status: 400 }
    );
  }

  global.io?.emit('schedule:update');
  global.io?.emit('match:created');

  return NextResponse.json({
    ok: true,
    matches: created.map(c => ({
      courtId: c.courtId, courtName: c.courtName, matchId: c.matchId, category: c.category,
      team1: c.t1.map(p => ({ id: p.id, name: p.name, rank: p.rank })),
      team2: c.t2.map(p => ({ id: p.id, name: p.name, rank: p.rank })),
    })),
  }, { status: 201 });
}

// PUT — end a specific match (or any active one if not specified)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { matchId, winningTeam } = body as { matchId?: string; winningTeam?: number | null };

  const schedule = await prisma.schedule.findUnique({ where: { id: params.id } });
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  if (schedule.qmasterId !== qmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const match = matchId
    ? await prisma.match.findUnique({ where: { id: matchId }, include: { players: true } })
    : await prisma.match.findFirst({
        where: { scheduleId: schedule.id, status: 'Playing' },
        include: { players: true },
      });

  if (!match || match.scheduleId !== schedule.id) {
    return NextResponse.json({ error: 'Match not found in this schedule' }, { status: 404 });
  }

  await prisma.$transaction(async tx => {
    await tx.match.update({
      where: { id: match.id },
      data: { status: 'Completed', winningTeam: winningTeam ?? null, endTime: new Date() },
    });
    if (match.courtId) {
      await tx.court.update({ where: { id: match.courtId }, data: { status: 'Available' } });
    }
    for (const mp of match.players) {
      const isWinner = mp.team === winningTeam;
      await tx.player.update({
        where: { id: mp.playerId },
        data: {
          status: 'Offline',
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
