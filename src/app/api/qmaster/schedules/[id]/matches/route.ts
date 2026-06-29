import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionQMasterId } from '@/lib/auth';

// GET /api/qmaster/schedules/[id]/matches — match history for THIS schedule
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const schedule = await prisma.schedule.findUnique({ where: { id: params.id } });
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  if (schedule.qmasterId !== qmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const matches = await prisma.match.findMany({
    where: { scheduleId: params.id },
    include: { players: { include: { player: true }, orderBy: { team: 'asc' } } },
    orderBy: { startTime: 'desc' },
  });

  return NextResponse.json(matches);
}
