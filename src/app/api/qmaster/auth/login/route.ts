import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPin, createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json();
    if (!username?.trim() || !pin) {
      return NextResponse.json({ error: 'Username and PIN required' }, { status: 400 });
    }

    const qm = await prisma.qMaster.findUnique({
      where: { username: String(username).toLowerCase().trim() },
    });

    if (!qm || !verifyPin(String(pin), qm.pinHash)) {
      return NextResponse.json({ error: 'Invalid username or PIN' }, { status: 401 });
    }
    if (!qm.active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    setSessionCookie(createSessionToken(qm.id, 'qmaster'));
    return NextResponse.json({ ok: true, qmasterId: qm.id, name: qm.name });
  } catch (error) {
    console.error('[POST /api/qmaster/auth/login]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
