import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPlayerId } from '@/lib/auth';

export async function GET() {
  try {
    const id = getSessionPlayerId();
    if (!id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const matchPlayers = await prisma.matchPlayer.findMany({
      where: { playerId: id, match: { status: 'Completed' } },
      include: {
        match: {
          include: {
            court: true,
            players: { include: { player: true } },
          },
        },
      },
      orderBy: { match: { startTime: 'desc' } },
      take: 30,
    });

    const formatted = matchPlayers.map(mp => {
      const myTeam = mp.team;
      const won = mp.match.winningTeam === myTeam;
      const lost = mp.match.winningTeam !== null && mp.match.winningTeam !== myTeam;
      return {
        id: mp.match.id,
        startTime: mp.match.startTime,
        endTime: mp.match.endTime,
        category: mp.match.category,
        court: mp.match.court.name,
        myTeam,
        won,
        lost,
        winningTeam: mp.match.winningTeam,
        partner: mp.match.players
          .filter(p => p.playerId !== id && p.team === myTeam)
          .map(p => ({ id: p.playerId, name: p.player.name, rank: p.player.rank })),
        opponents: mp.match.players
          .filter(p => p.team !== myTeam)
          .map(p => ({ id: p.playerId, name: p.player.name, rank: p.player.rank })),
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('[GET /api/player/matches]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
