import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPin, createSessionToken, setSessionCookie, isValidPin, isValidUsername } from '@/lib/auth';

// Admin signup is gated to prevent random people from creating admin accounts.
// EITHER:
//   1. No admin exists yet (bootstrapping the first admin), OR
//   2. Caller provides the ADMIN_SIGNUP_SECRET env value
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, username, pin, signupSecret } = body as {
      name: string;
      username: string;
      pin: string;
      signupSecret?: string;
    };

    const existingCount = await prisma.admin.count();
    const expectedSecret = process.env.ADMIN_SIGNUP_SECRET;

    if (existingCount > 0) {
      if (!expectedSecret || signupSecret !== expectedSecret) {
        return NextResponse.json(
          { error: 'Admin signup secret required (set ADMIN_SIGNUP_SECRET on the server)' },
          { status: 403 }
        );
      }
    }

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!username?.trim() || !isValidUsername(username)) {
      return NextResponse.json({ error: 'Username must be 3-20 chars: letters, numbers, underscore' }, { status: 400 });
    }
    if (!pin || !isValidPin(pin)) {
      return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 });
    }

    const u = username.toLowerCase().trim();
    const taken = await prisma.admin.findUnique({ where: { username: u } });
    if (taken) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });

    const admin = await prisma.admin.create({
      data: { name: name.trim(), username: u, pinHash: hashPin(pin), active: true },
    });

    setSessionCookie(createSessionToken(admin.id, 'admin'));
    return NextResponse.json({ ok: true, adminId: admin.id, name: admin.name }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/auth/signup]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
