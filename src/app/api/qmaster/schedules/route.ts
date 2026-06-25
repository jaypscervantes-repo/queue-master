import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionQMasterId } from '@/lib/auth';

// GET /api/qmaster/schedules — list schedules owned by the logged-in Q Master
export async function GET() {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const schedules = await prisma.schedule.findMany({
    where: { qmasterId: qmId, cancelled: false },
    include: { _count: { select: { queueEntries: true } } },
    orderBy: { startTime: 'asc' },
  });

  return NextResponse.json(schedules);
}

// POST /api/qmaster/schedules — create a new schedule
// Returns a duplicate warning (200 with `warning`) if another schedule has same court + overlapping time
export async function POST(req: NextRequest) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { name, courtName, courtContact, contactPerson, startTime, endTime, confirmDuplicate } = body as {
    name?: string;
    courtName: string;
    courtContact: string;
    contactPerson: string;
    startTime: string;
    endTime: string;
    confirmDuplicate?: boolean;
  };

  if (!courtName?.trim() || !courtContact?.trim() || !contactPerson?.trim() || !startTime || !endTime) {
    return NextResponse.json(
      { error: 'Court name, contact person, court contact, start time, and end time are required' },
      { status: 400 }
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid date/time format' }, { status: 400 });
  }
  if (start >= end) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
  }

  // Duplicate check — same court name, overlapping time, any Q Master, not cancelled
  if (!confirmDuplicate) {
    const conflict = await prisma.schedule.findFirst({
      where: {
        courtName: courtName.trim(),
        cancelled: false,
        AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
      },
      include: { qmaster: { select: { name: true, username: true } } },
    });

    if (conflict) {
      return NextResponse.json({
        ok: false,
        duplicate: true,
        message: `${conflict.courtName} is already booked from ${conflict.startTime} to ${conflict.endTime} by ${conflict.qmaster.name} (@${conflict.qmaster.username}). Create anyway?`,
        conflict: {
          id: conflict.id,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          qmaster: conflict.qmaster,
        },
      }, { status: 200 });
    }
  }

  const schedule = await prisma.schedule.create({
    data: {
      qmasterId: qmId,
      name: name?.trim() || null,
      courtName: courtName.trim(),
      courtContact: courtContact.trim(),
      contactPerson: contactPerson.trim(),
      startTime: start,
      endTime: end,
    },
  });

  global.io?.emit('schedule:update');

  return NextResponse.json({ ok: true, schedule }, { status: 201 });
}
