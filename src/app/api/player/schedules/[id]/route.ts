import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPlayerId } from '@/lib/auth';

// POST — player joins a schedule's queue. Blocks if a time conflict with another joined schedule exists.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const playerId = getSessionPlayerId();
  if (!playerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const schedule = await prisma.schedule.findUnique({ where: { id: params.id } });
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  if (schedule.cancelled) return NextResponse.json({ error: 'Schedule was cancelled' }, { status: 409 });

  // Already joined?
  const already = await prisma.scheduleQueueEntry.findUnique({
    where: { scheduleId_playerId: { scheduleId: params.id, playerId } },
  });
  if (already) return NextResponse.json({ error: 'You already joined this schedule' }, { status: 409 });

  // Conflict check: any other joined schedule with overlapping date/time
  const conflicts = await prisma.scheduleQueueEntry.findMany({
    where: {
      playerId,
      schedule: {
        cancelled: false,
        AND: [{ startTime: { lt: schedule.endTime } }, { endTime: { gt: schedule.startTime } }],
      },
    },
    include: { schedule: true },
  });

  if (conflicts.length > 0) {
    const c = conflicts[0].schedule;
    return NextResponse.json(
      {
        error: 'TIME_CONFLICT',
        message: `You're already in "${c.courtName}" from ${c.startTime.toISOString()} to ${c.endTime.toISOString()}. You can't join two schedules at the same time.`,
        conflict: { id: c.id, courtName: c.courtName, startTime: c.startTime, endTime: c.endTime },
      },
      { status: 409 }
    );
  }

  const entry = await prisma.scheduleQueueEntry.create({
    data: { scheduleId: params.id, playerId },
  });

  global.io?.emit('schedule:update');
  return NextResponse.json({ ok: true, entry }, { status: 201 });
}

// DELETE — player leaves a schedule's queue
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const playerId = getSessionPlayerId();
  if (!playerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  await prisma.scheduleQueueEntry.deleteMany({
    where: { scheduleId: params.id, playerId },
  });

  global.io?.emit('schedule:update');
  return NextResponse.json({ ok: true });
}
