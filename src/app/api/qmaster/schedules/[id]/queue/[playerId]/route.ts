import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionQMasterId } from '@/lib/auth';

// POST — Q Master adds a player to their schedule's queue (manual add, bypasses self-registration)
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; playerId: string } }
) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const s = await prisma.schedule.findUnique({ where: { id: params.id } });
  if (!s) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  if (s.qmasterId !== qmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const player = await prisma.player.findUnique({ where: { id: params.playerId } });
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  if (!player.active) return NextResponse.json({ error: 'Player is deactivated' }, { status: 409 });

  const existing = await prisma.scheduleQueueEntry.findUnique({
    where: { scheduleId_playerId: { scheduleId: params.id, playerId: params.playerId } },
  });
  if (existing) return NextResponse.json({ error: 'Player already in this queue' }, { status: 409 });

  // Check time-conflict — same player can't be in two schedules at the same time
  const conflicts = await prisma.scheduleQueueEntry.findMany({
    where: {
      playerId: params.playerId,
      schedule: {
        cancelled: false,
        AND: [{ startTime: { lt: s.endTime } }, { endTime: { gt: s.startTime } }],
      },
    },
    include: { schedule: true },
  });
  if (conflicts.length > 0) {
    const c = conflicts[0].schedule;
    return NextResponse.json(
      { error: `${player.name} is already in "${c.courtName}" at the same time.` },
      { status: 409 }
    );
  }

  await prisma.scheduleQueueEntry.create({
    data: { scheduleId: params.id, playerId: params.playerId },
  });

  global.io?.emit('schedule:update');
  return NextResponse.json({ ok: true }, { status: 201 });
}

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
