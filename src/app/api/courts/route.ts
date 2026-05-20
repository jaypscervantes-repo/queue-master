import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const courts = await prisma.court.findMany({
      where: { active: true },
      include: {
        matches: {
          where: { status: 'Playing' },
          include: {
            players: { include: { player: true } },
          },
          take: 1,
          orderBy: { startTime: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const courtsWithMatch = courts.map(court => ({
      ...court,
      currentMatch: court.matches[0] ?? null,
    }));

    return NextResponse.json(courtsWithMatch);
  } catch (error) {
    console.error('[GET /api/courts]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body as { name: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Court name is required' }, { status: 400 });
    }

    const court = await prisma.court.create({
      data: { name: name.trim() },
    });

    global.io?.emit('court:update');

    return NextResponse.json(court, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Court name already exists' }, { status: 409 });
    }
    console.error('[POST /api/courts]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
