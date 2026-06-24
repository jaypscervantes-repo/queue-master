import { NextResponse } from 'next/server';
import { getCurrentQMaster } from '@/lib/auth';

export async function GET() {
  const qm = await getCurrentQMaster();
  if (!qm) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { pinHash, ...safe } = qm;
  return NextResponse.json(safe);
}
