import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays, format } from 'date-fns';

export async function GET() {
  try {
    const thirtyDaysAgo = subDays(new Date(), 30);

    const [recentMatches, allPlayers, categoryBreakdown] = await Promise.all([
      prisma.match.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, startTime: true, endTime: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.player.findMany({
        where: { active: true },
        select: { rank: true, totalWins: true, gamesPlayed: true, name: true },
        orderBy: { totalWins: 'desc' },
      }),
      prisma.match.groupBy({
        by: ['category'],
        _count: { _all: true },
        where: { status: 'Completed' },
      }),
    ]);

    // Matches per day (last 14 days)
    const last14 = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      return format(d, 'MMM d');
    });

    const dayMap = new Map<string, number>();
    for (const m of recentMatches) {
      const key = format(new Date(m.createdAt), 'MMM d');
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    }

    const matchesByDay = last14.map(d => ({ date: d, count: dayMap.get(d) ?? 0 }));

    // Category breakdown
    const categoryData = categoryBreakdown.map(c => ({
      category: c.category
        .replace('MensDoubles', "Men's Doubles")
        .replace('WomensDoubles', "Women's Doubles")
        .replace('MixedDoubles', 'Mixed Doubles'),
      count: c._count._all,
    }));

    // Rank distribution
    const rankCount = new Map<string, number>();
    for (const p of allPlayers) {
      rankCount.set(p.rank, (rankCount.get(p.rank) ?? 0) + 1);
    }
    const rankDistribution = ['A', 'B', 'C', 'D', 'E'].map(r => ({
      rank: r,
      count: rankCount.get(r) ?? 0,
    }));

    // Top players by wins
    const topPlayers = allPlayers.slice(0, 10).map(p => ({
      name: p.name,
      wins: p.totalWins,
      gamesPlayed: p.gamesPlayed,
    }));

    // Average match duration (minutes)
    const completedWithTimes = recentMatches.filter(m => m.endTime);
    const avgMatchDuration =
      completedWithTimes.length > 0
        ? completedWithTimes.reduce((sum, m) => {
            const diff =
              (new Date(m.endTime!).getTime() - new Date(m.startTime).getTime()) / 60_000;
            return sum + diff;
          }, 0) / completedWithTimes.length
        : 0;

    return NextResponse.json({
      matchesByDay,
      categoryBreakdown: categoryData,
      rankDistribution,
      topPlayers,
      avgMatchDuration: Math.round(avgMatchDuration),
      totalMatches: recentMatches.length,
      totalPlayers: allPlayers.length,
    });
  } catch (error) {
    console.error('[GET /api/analytics]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
