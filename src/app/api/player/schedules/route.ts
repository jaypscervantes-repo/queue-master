import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPlayerId } from '@/lib/auth';

// GET /api/player/schedules — list schedules the player has joined
export async function GET() {
  const playerId = getSessionPlayerId();
  if (!playerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const entries = await prisma.scheduleQueueEntry.findMany({
    where: { playerId },
    include: {
      schedule: {
        include: {
          qmaster: { select: { name: true, username: true } },
          _count: { select: { queueEntries: true } },
        },
      },
    },
    orderBy: { schedule: { startTime: 'asc' } },
  });

  return NextResponse.json(
    entries
      .filter(e => !e.schedule.cancelled)
      .map(e => ({
        ...e.schedule,
        joinedAt: e.joinedAt,
      }))
  );
}
