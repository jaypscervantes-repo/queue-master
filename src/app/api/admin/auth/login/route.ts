import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPin, createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json();
    if (!username?.trim() || !pin) {
      return NextResponse.json({ error: 'Username and PIN required' }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({
      where: { username: String(username).toLowerCase().trim() },
    });

    if (!admin || !verifyPin(String(pin), admin.pinHash)) {
      return NextResponse.json({ error: 'Invalid username or PIN' }, { status: 401 });
    }
    if (!admin.active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    setSessionCookie(createSessionToken(admin.id, 'admin'));
    return NextResponse.json({ ok: true, adminId: admin.id, name: admin.name });
  } catch (error) {
    console.error('[POST /api/admin/auth/login]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
