import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPlayerId } from '@/lib/auth';

// GET /api/schedules — list ALL upcoming schedules, visible to players
// Adds `joined: boolean` if the caller is a logged-in player
export async function GET() {
  const playerId = getSessionPlayerId();
  const now = new Date();

  const schedules = await prisma.schedule.findMany({
    where: {
      cancelled: false,
      endTime: { gt: now },
    },
    include: {
      qmaster: { select: { name: true, username: true } },
      _count: { select: { queueEntries: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  // Mark which ones the current player has joined
  let joinedSet = new Set<string>();
  if (playerId) {
    const joined = await prisma.scheduleQueueEntry.findMany({
      where: { playerId },
      select: { scheduleId: true },
    });
    joinedSet = new Set(joined.map(j => j.scheduleId));
  }

  return NextResponse.json(
    schedules.map(s => ({ ...s, joined: joinedSet.has(s.id) }))
  );
}
