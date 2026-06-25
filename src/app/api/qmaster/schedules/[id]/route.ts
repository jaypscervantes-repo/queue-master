import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionQMasterId } from '@/lib/auth';

async function assertOwnership(scheduleId: string, qmId: string) {
  const s = await prisma.schedule.findUnique({ where: { id: scheduleId } });
  if (!s) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  if (s.qmasterId !== qmId) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { schedule: s };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { error } = await assertOwnership(params.id, qmId);
  if (error) return error;

  const schedule = await prisma.schedule.findUnique({
    where: { id: params.id },
    include: {
      queueEntries: {
        include: { player: true },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  return NextResponse.json(schedule);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { error } = await assertOwnership(params.id, qmId);
  if (error) return error;

  const body = await req.json();
  const { name, courtName, courtContact, contactPerson, startTime, endTime } = body;

  const updated = await prisma.schedule.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: name?.trim() || null } : {}),
      ...(courtName !== undefined ? { courtName: courtName.trim() } : {}),
      ...(courtContact !== undefined ? { courtContact: courtContact.trim() } : {}),
      ...(contactPerson !== undefined ? { contactPerson: contactPerson.trim() } : {}),
      ...(startTime !== undefined ? { startTime: new Date(startTime) } : {}),
      ...(endTime !== undefined ? { endTime: new Date(endTime) } : {}),
    },
  });

  global.io?.emit('schedule:update');
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const qmId = getSessionQMasterId();
  if (!qmId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { error } = await assertOwnership(params.id, qmId);
  if (error) return error;

  await prisma.schedule.delete({ where: { id: params.id } });
  global.io?.emit('schedule:update');
  return NextResponse.json({ ok: true });
}
