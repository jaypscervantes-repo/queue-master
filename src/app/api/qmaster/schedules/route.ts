import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionQMasterId } from '@/lib/auth';
import crypto from 'crypto';

// Generate every (startDate..untilDate) date whose weekday is in `weekdays` (0=Sun, 1=Mon, ..., 6=Sat)
// keeping the hours/minutes of the originalStart and originalEnd.
function buildOccurrences(
  originalStart: Date,
  originalEnd: Date,
  weekdays: number[],
  untilDate: Date
): { start: Date; end: Date }[] {
  if (weekdays.length === 0) return [{ start: originalStart, end: originalEnd }];
  const occurrences: { start: Date; end: Date }[] = [];
  const startHours = originalStart.getHours();
  const startMinutes = originalStart.getMinutes();
  const endHours = originalEnd.getHours();
  const endMinutes = originalEnd.getMinutes();
  const cursor = new Date(originalStart);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(untilDate);
  last.setHours(23, 59, 59, 999);

  while (cursor <= last) {
    if (weekdays.includes(cursor.getDay())) {
      const s = new Date(cursor); s.setHours(startHours, startMinutes, 0, 0);
      const e = new Date(cursor); e.setHours(endHours, endMinutes, 0, 0);
      // Only include if start >= originalStart (don't generate occurrences before the user-picked first date)
      if (s.getTime() >= originalStart.getTime() - 60_000) {
        occurrences.push({ start: s, end: e });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return occurrences;
}

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
  const {
    name, courtName, courtContact, contactPerson, startTime, endTime,
    confirmDuplicate, recurrence,
  } = body as {
    name?: string;
    courtName: string;
    courtContact: string;
    contactPerson: string;
    startTime: string;
    endTime: string;
    confirmDuplicate?: boolean;
    recurrence?: { weekdays: number[]; untilDate: string } | null;
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

  // Build list of (start, end) pairs — one for single, many for recurring
  let occurrences: { start: Date; end: Date }[] = [{ start, end }];
  let recurrenceGroupId: string | null = null;

  if (recurrence && recurrence.weekdays?.length > 0 && recurrence.untilDate) {
    const until = new Date(recurrence.untilDate);
    if (Number.isNaN(until.getTime())) {
      return NextResponse.json({ error: 'Invalid recurrence end date' }, { status: 400 });
    }
    if (until < start) {
      return NextResponse.json({ error: 'Recurrence end date must be after the first occurrence' }, { status: 400 });
    }
    occurrences = buildOccurrences(start, end, recurrence.weekdays, until);
    if (occurrences.length === 0) {
      return NextResponse.json({ error: 'No occurrences match the chosen weekdays in this date range' }, { status: 400 });
    }
    if (occurrences.length > 60) {
      return NextResponse.json({ error: `Too many occurrences (${occurrences.length}). Pick a shorter range or fewer weekdays.` }, { status: 400 });
    }
    recurrenceGroupId = crypto.randomUUID();
  }

  // Duplicate check across all occurrences
  if (!confirmDuplicate) {
    for (const occ of occurrences) {
      const conflict = await prisma.schedule.findFirst({
        where: {
          courtName: courtName.trim(),
          cancelled: false,
          AND: [{ startTime: { lt: occ.end } }, { endTime: { gt: occ.start } }],
        },
        include: { qmaster: { select: { name: true, username: true } } },
      });
      if (conflict) {
        const extra = occurrences.length > 1
          ? ` (occurrence ${occurrences.indexOf(occ) + 1} of ${occurrences.length})`
          : '';
        return NextResponse.json({
          ok: false,
          duplicate: true,
          message: `${conflict.courtName} is already booked at ${conflict.startTime} by ${conflict.qmaster.name} (@${conflict.qmaster.username})${extra}. Create anyway?`,
          conflict: {
            id: conflict.id,
            startTime: conflict.startTime,
            endTime: conflict.endTime,
            qmaster: conflict.qmaster,
          },
        }, { status: 200 });
      }
    }
  }

  // Create all occurrences (each with its own Court 1)
  const created = await prisma.$transaction(
    occurrences.map(occ =>
      prisma.schedule.create({
        data: {
          qmasterId: qmId,
          name: name?.trim() || null,
          courtName: courtName.trim(),
          courtContact: courtContact.trim(),
          contactPerson: contactPerson.trim(),
          startTime: occ.start,
          endTime: occ.end,
          recurrenceGroupId,
          courts: { create: { name: 'Court 1' } },
        },
      })
    )
  );

  global.io?.emit('schedule:update');

  return NextResponse.json({
    ok: true,
    schedule: created[0],
    createdCount: created.length,
    recurrenceGroupId,
  }, { status: 201 });
}
