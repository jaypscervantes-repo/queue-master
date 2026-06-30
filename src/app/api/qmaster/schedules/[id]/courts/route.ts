import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionQMasterId } from '@/lib/auth';

// POST /api/qmaster/schedules/[id]/courts — add a new court to this schedule
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const schedule = await prisma.schedule.findUnique({ where: { id: params.id } });
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  if (schedule.qmasterId !== qmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Court name is required' }, { status: 400 });

  try {
    const court = await prisma.court.create({
      data: { scheduleId: params.id, name: name.trim() },
    });
    global.io?.emit('schedule:update');
    return NextResponse.json(court, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A court with that name already exists in this schedule' }, { status: 409 });
    }
    throw e;
  }
}
