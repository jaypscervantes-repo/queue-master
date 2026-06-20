import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPlayerId } from '@/lib/auth';

// POST — current player joins the queue
export async function POST() {
  try {
    const id = getSessionPlayerId();
    if (!id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (player.status === 'Playing') {
      return NextResponse.json({ error: 'You are currently in a match' }, { status: 409 });
    }

    const existing = await prisma.queueEntry.findUnique({ where: { playerId: id } });
    if (existing) {
      return NextResponse.json({ error: 'You are already in the queue' }, { status: 409 });
    }

    const queueCount = await prisma.queueEntry.count();
    const entry = await prisma.queueEntry.create({
      data: {
        playerId: id,
        position: queueCount + 1,
        queuedAt: new Date(),
      },
    });

    await prisma.player.update({
      where: { id },
      data: {
        status: 'Queued',
        checkInTime: player.checkInTime ?? new Date(),
        waitingStartTime: new Date(),
        autoRequeue: true,
      },
    });

    global.io?.emit('queue:update');
    global.io?.emit('stats:update');

    return NextResponse.json({ ok: true, position: queueCount + 1, entry }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/player/queue]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — current player leaves the queue or marks themselves "done for the day"
export async function DELETE() {
  try {
    const id = getSessionPlayerId();
    if (!id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (player.status === 'Playing') {
      // Mid-match: flag to leave after match
      await prisma.player.update({ where: { id }, data: { autoRequeue: false } });
    } else {
      await prisma.queueEntry.deleteMany({ where: { playerId: id } });
      await prisma.player.update({
        where: { id },
        data: { status: 'Offline', waitingStartTime: null, autoRequeue: true },
      });
    }

    global.io?.emit('queue:update');
    global.io?.emit('player:update', { playerId: id });
    global.io?.emit('stats:update');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/player/queue]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
