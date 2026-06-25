import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { pinHash, ...safe } = admin;
  return NextResponse.json(safe);
}
