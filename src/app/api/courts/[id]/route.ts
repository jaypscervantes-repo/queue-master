import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { name, status, active } = body;

    const court = await prisma.court.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    global.io?.emit('court:update');

    return NextResponse.json(court);
  } catch (error) {
    console.error('[PUT /api/courts/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check no active match
    const activeMatch = await prisma.match.findFirst({
      where: { courtId: params.id, status: 'Playing' },
    });

    if (activeMatch) {
      return NextResponse.json(
        { error: 'Cannot remove court with an active match' },
        { status: 409 }
      );
    }

    await prisma.court.update({
      where: { id: params.id },
      data: { active: false },
    });

    global.io?.emit('court:update');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/courts/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
