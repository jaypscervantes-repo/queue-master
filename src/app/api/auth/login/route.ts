import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPin, createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json();
    if (!username?.trim() || !pin) {
      return NextResponse.json({ error: 'Username and PIN are required' }, { status: 400 });
    }

    const player = await prisma.player.findUnique({
      where: { username: username.toLowerCase().trim() },
    });

    if (!player || !player.pinHash || !verifyPin(pin, player.pinHash)) {
      return NextResponse.json({ error: 'Invalid username or PIN' }, { status: 401 });
    }

    if (!player.active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    setSessionCookie(createSessionToken(player.id));
    return NextResponse.json({ ok: true, playerId: player.id, name: player.name });
  } catch (error) {
    console.error('[POST /api/auth/login]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
