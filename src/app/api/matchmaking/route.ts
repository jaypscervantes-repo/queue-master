import { NextResponse } from 'next/server';
import { runMatchmaking, executeMatches } from '@/lib/matchmaking';
import { prisma } from '@/lib/prisma';
import { isSessionActive } from '@/lib/utils';

export async function POST() {
  try {
    // Block starting matches outside of an active session
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!isSessionActive(settings?.sessionStart, settings?.sessionEnd)) {
      return NextResponse.json(
        {
          ok: false,
          reason:
            'No active session. Set a session schedule (click the banner at the top of the dashboard) before starting matches. You can still add players to the queue.',
        },
        { status: 400 }
      );
    }

    const diagnostic = await runMatchmaking();

    if (diagnostic.results.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          reason: diagnostic.reason ?? 'No matches could be formed.',
          queueCount: diagnostic.queueCount,
          availableCourtCount: diagnostic.availableCourtCount,
          matches: [],
        },
        { status: 400 }
      );
    }

    await executeMatches(diagnostic.results);

    global.io?.emit('match:created', { count: diagnostic.results.length });
    global.io?.emit('queue:update');
    global.io?.emit('court:update');
    global.io?.emit('stats:update');

    return NextResponse.json({
      ok: true,
      message: `${diagnostic.results.length} match(es) created successfully.`,
      matches: diagnostic.results.map(r => ({
        courtId: r.courtId,
        category: r.candidate.category,
        team1: r.candidate.team1.map(p => ({ id: p.id, name: p.name, rank: p.rank })),
        team2: r.candidate.team2.map(p => ({ id: p.id, name: p.name, rank: p.rank })),
        score: r.candidate.score,
      })),
    });
  } catch (error) {
    console.error('[POST /api/matchmaking]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Preview matchmaking without executing
export async function GET() {
  try {
    const diagnostic = await runMatchmaking();

    return NextResponse.json({
      preview: true,
      reason: diagnostic.reason,
      matches: diagnostic.results.map(r => ({
        courtId: r.courtId,
        category: r.candidate.category,
        team1: r.candidate.team1.map(p => ({ id: p.id, name: p.name, rank: p.rank, gender: p.gender })),
        team2: r.candidate.team2.map(p => ({ id: p.id, name: p.name, rank: p.rank, gender: p.gender })),
        score: r.candidate.score,
      })),
    });
  } catch (error) {
    console.error('[GET /api/matchmaking]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
