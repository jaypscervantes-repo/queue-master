import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPlayerId } from '@/lib/auth';

export async function GET() {
  try {
    const id = getSessionPlayerId();
    if (!id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [player, settings] = await Promise.all([
      prisma.player.findUnique({
        where: { id },
        include: {
          queueEntry: true,
          matchPlayers: {
            where: { match: { status: 'Playing' } },
            include: {
              match: {
                include: {
                  court: true,
                  players: { include: { player: true } },
                },
              },
            },
            take: 1,
          },
        },
      }),
      prisma.settings.findUnique({ where: { id: 1 } }),
    ]);

    if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Compute queue position
    let queuePosition: number | null = null;
    if (player.queueEntry) {
      const ahead = await prisma.queueEntry.count({
        where: { queuedAt: { lt: player.queueEntry.queuedAt } },
      });
      queuePosition = ahead + 1;
    }

    // Compute win rate
    const winRate = player.gamesPlayed > 0
      ? Math.round((player.totalWins / player.gamesPlayed) * 100)
      : 0;

    const { pinHash, ...safe } = player;
    return NextResponse.json({
      ...safe,
      queuePosition,
      winRate,
      session: settings ? {
        sessionStart: settings.sessionStart,
        sessionEnd: settings.sessionEnd,
        avgMatchDuration: settings.avgMatchDuration,
      } : null,
    });
  } catch (error) {
    console.error('[GET /api/player/stats]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
