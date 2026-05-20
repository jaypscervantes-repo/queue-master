import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const player = await prisma.player.findUnique({
      where: { id: params.id },
      include: {
        queueEntry: true,
        matchPlayers: {
          include: { match: { include: { players: { include: { player: true } } } } },
          orderBy: { match: { startTime: 'desc' } },
          take: 10,
        },
      },
    });

    if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(player);
  } catch (error) {
    console.error('[GET /api/players/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { name, gender, rank, preferredCategories, status, active } = body;

    const player = await prisma.player.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(rank !== undefined ? { rank } : {}),
        ...(preferredCategories !== undefined ? { preferredCategories } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    global.io?.emit('player:update', { playerId: player.id });
    global.io?.emit('stats:update');

    return NextResponse.json(player);
  } catch (error) {
    console.error('[PUT /api/players/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Remove from queue if queued
    await prisma.queueEntry.deleteMany({ where: { playerId: params.id } });

    await prisma.player.update({
      where: { id: params.id },
      data: { active: false, status: 'Offline' },
    });

    global.io?.emit('queue:update');
    global.io?.emit('stats:update');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/players/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
