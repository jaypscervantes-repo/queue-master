import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Gender, Rank, MatchCategory } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const active = searchParams.get('active');

    const players = await prisma.player.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(active !== null ? { active: active === 'true' } : {}),
      },
      include: { queueEntry: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error('[GET /api/players]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, gender, rank, preferredCategories } = body as {
      name: string;
      gender: Gender;
      rank: Rank;
      preferredCategories: MatchCategory[];
    };

    if (!name?.trim() || !gender || !rank || !preferredCategories?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const player = await prisma.player.create({
      data: {
        name: name.trim(),
        gender,
        rank,
        preferredCategories,
        status: 'Offline',
        active: true,
      },
    });

    global.io?.emit('player:update', { playerId: player.id });
    global.io?.emit('stats:update');

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error('[POST /api/players]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
