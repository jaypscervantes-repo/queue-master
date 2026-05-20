import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const page = parseInt(searchParams.get('page') ?? '1');

    const matches = await prisma.match.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        court: true,
        players: {
          include: { player: true },
          orderBy: { team: 'asc' },
        },
      },
      orderBy: { startTime: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const total = await prisma.match.count({
      where: status ? { status: status as any } : undefined,
    });

    return NextResponse.json({ matches, total, page, limit });
  } catch (error) {
    console.error('[GET /api/matches]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
