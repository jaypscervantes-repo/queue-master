import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { endMatch } from '@/lib/matchmaking';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        court: true,
        players: { include: { player: true }, orderBy: { team: 'asc' } },
      },
    });

    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(match);
  } catch (error) {
    console.error('[GET /api/matches/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { action, winningTeam } = body as { action: 'end' | 'cancel'; winningTeam?: number };

    if (action === 'end' || action === 'cancel') {
      await endMatch(params.id, winningTeam ?? null);

      const match = await prisma.match.findUnique({
        where: { id: params.id },
        include: { court: true, players: { include: { player: true } } },
      });

      global.io?.emit('match:ended', { matchId: params.id, courtId: match?.courtId });
      global.io?.emit('court:update');
      global.io?.emit('stats:update');

      return NextResponse.json(match);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[PUT /api/matches/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
