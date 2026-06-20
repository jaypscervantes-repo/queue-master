import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPin, createSessionToken, setSessionCookie, isValidPin, isValidUsername } from '@/lib/auth';
import type { Gender, Rank, MatchCategory } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, gender, rank, preferredCategories, username, pin } = body as {
      name: string;
      gender: Gender;
      rank: Rank;
      preferredCategories: MatchCategory[];
      username: string;
      pin: string;
    };

    if (!name?.trim() || !gender || !rank || !preferredCategories?.length) {
      return NextResponse.json({ error: 'Player profile fields are required' }, { status: 400 });
    }
    if (!username?.trim() || !isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters: letters, numbers, underscore' },
        { status: 400 }
      );
    }
    if (!pin || !isValidPin(pin)) {
      return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 });
    }

    const u = username.toLowerCase().trim();
    const taken = await prisma.player.findUnique({ where: { username: u } });
    if (taken) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const player = await prisma.player.create({
      data: {
        name: name.trim(),
        gender,
        rank,
        preferredCategories,
        username: u,
        pinHash: hashPin(pin),
        status: 'Offline',
        active: true,
      },
    });

    setSessionCookie(createSessionToken(player.id));
    global.io?.emit('player:update', { playerId: player.id });
    global.io?.emit('stats:update');

    return NextResponse.json(
      { ok: true, playerId: player.id, name: player.name },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/auth/signup]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
