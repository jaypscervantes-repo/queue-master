import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionQMasterId } from '@/lib/auth';

// DELETE /api/qmaster/schedules/[id]/courts/[courtId] — remove a court (only if idle)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; courtId: string } }
) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const schedule = await prisma.schedule.findUnique({ where: { id: params.id } });
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  if (schedule.qmasterId !== qmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const court = await prisma.court.findUnique({ where: { id: params.courtId } });
  if (!court || court.scheduleId !== params.id) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404 });
  }

  // Block removal if a match is in progress on this court
  const activeMatch = await prisma.match.findFirst({
    where: { courtId: params.courtId, status: 'Playing' },
  });
  if (activeMatch) {
    return NextResponse.json(
      { error: 'Cannot remove a court with an active match. End the match first.' },
      { status: 409 }
    );
  }

  await prisma.court.update({
    where: { id: params.courtId },
    data: { active: false },
  });

  global.io?.emit('schedule:update');
  return NextResponse.json({ ok: true });
}
