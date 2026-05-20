import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Gender, Rank, MatchCategory } from '@/types';

export async function GET() {
  try {
    const queue = await prisma.queueEntry.findMany({
      include: { player: true },
      orderBy: { queuedAt: 'asc' },
    });
    return NextResponse.json(queue);
  } catch (error) {
    console.error('[GET /api/queue]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Join queue — can be called for an existing player or with inline player data for self-registration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let playerId: string;

    // Self-registration path: create player on-the-fly
    if (!body.playerId) {
      const { name, gender, rank, preferredCategories } = body as {
        name: string;
        gender: Gender;
        rank: Rank;
        preferredCategories: MatchCategory[];
      };

      if (!name?.trim() || !gender || !rank || !preferredCategories?.length) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const player = await prisma.player.create({
        data: {
          name: name.trim(),
          gender,
          rank,
          preferredCategories,
          status: 'Queued',
          checkInTime: new Date(),
          waitingStartTime: new Date(),
          active: true,
        },
      });
      playerId = player.id;
    } else {
      playerId = body.playerId;
    }

    // Check if already queued
    const existing = await prisma.queueEntry.findUnique({ where: { playerId } });
    if (existing) {
      return NextResponse.json({ error: 'Player already in queue' }, { status: 409 });
    }

    // Check player is not playing
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    if (player.status === 'Playing') {
      return NextResponse.json({ error: 'Player is currently playing' }, { status: 409 });
    }

    const queueCount = await prisma.queueEntry.count();

    const entry = await prisma.queueEntry.create({
      data: {
        playerId,
        position: queueCount + 1,
        queuedAt: new Date(),
      },
      include: { player: true },
    });

    await prisma.player.update({
      where: { id: playerId },
      data: {
        status: 'Queued',
        checkInTime: player.checkInTime ?? new Date(),
        waitingStartTime: new Date(),
      },
    });

    global.io?.emit('queue:update');
    global.io?.emit('stats:update');

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('[POST /api/queue]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
