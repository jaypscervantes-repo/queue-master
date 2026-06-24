import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPin, createSessionToken, setSessionCookie, isValidPin, isValidUsername } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, username, pin, email } = body as {
      name: string;
      username: string;
      pin: string;
      email?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
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
    const taken = await prisma.qMaster.findUnique({ where: { username: u } });
    if (taken) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const qm = await prisma.qMaster.create({
      data: {
        name: name.trim(),
        username: u,
        pinHash: hashPin(pin),
        email: email?.trim() || null,
        active: true,
      },
    });

    setSessionCookie(createSessionToken(qm.id, 'qmaster'));

    return NextResponse.json(
      { ok: true, qmasterId: qm.id, name: qm.name },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/qmaster/auth/signup]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
