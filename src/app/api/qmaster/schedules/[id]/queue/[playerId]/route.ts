import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionQMasterId } from '@/lib/auth';

// DELETE — Q Master removes a player from one of their schedule's queues
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; playerId: string } }
) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const s = await prisma.schedule.findUnique({ where: { id: params.id } });
  if (!s) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  if (s.qmasterId !== qmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.scheduleQueueEntry.deleteMany({
    where: { scheduleId: params.id, playerId: params.playerId },
  });

  global.io?.emit('schedule:update');
  return NextResponse.json({ ok: true });
}
