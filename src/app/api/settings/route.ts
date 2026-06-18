import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getOrCreateSettings() {
  let s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s) {
    s = await prisma.settings.create({
      data: { id: 1, avgMatchDuration: 15 },
    });
  }
  return s;
}

export async function GET() {
  try {
    const s = await getOrCreateSettings();
    return NextResponse.json(s);
  } catch (error) {
    console.error('[GET /api/settings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionStart, sessionEnd, avgMatchDuration } = body as {
      sessionStart?: string | null;
      sessionEnd?: string | null;
      avgMatchDuration?: number;
    };

    await getOrCreateSettings();

    const updated = await prisma.settings.update({
      where: { id: 1 },
      data: {
        ...(sessionStart !== undefined
          ? { sessionStart: sessionStart ? new Date(sessionStart) : null }
          : {}),
        ...(sessionEnd !== undefined
          ? { sessionEnd: sessionEnd ? new Date(sessionEnd) : null }
          : {}),
        ...(avgMatchDuration !== undefined ? { avgMatchDuration } : {}),
      },
    });

    global.io?.emit('settings:update');
    global.io?.emit('stats:update');

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PUT /api/settings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
