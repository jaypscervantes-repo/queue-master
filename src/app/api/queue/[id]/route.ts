import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE — remove a player from the queue by their playerId
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const entry = await prisma.queueEntry.findFirst({
      where: { playerId: params.id },
    });

    if (!entry) return NextResponse.json({ error: 'Not in queue' }, { status: 404 });

    await prisma.queueEntry.delete({ where: { id: entry.id } });

    await prisma.player.update({
      where: { id: params.id },
      data: { status: 'Offline', waitingStartTime: null },
    });

    global.io?.emit('queue:update');
    global.io?.emit('stats:update');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/queue/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
