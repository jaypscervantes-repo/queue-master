import { NextResponse } from 'next/server';
import { runMatchmaking, executeMatches } from '@/lib/matchmaking';

export async function POST() {
  try {
    const results = await runMatchmaking();

    if (results.length === 0) {
      return NextResponse.json({
        message: 'No matches could be formed. Not enough eligible players or courts.',
        matches: [],
      });
    }

    await executeMatches(results);

    global.io?.emit('match:created', { count: results.length });
    global.io?.emit('queue:update');
    global.io?.emit('court:update');
    global.io?.emit('stats:update');

    return NextResponse.json({
      message: `${results.length} match(es) created successfully.`,
      matches: results.map(r => ({
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
    const results = await runMatchmaking();

    return NextResponse.json({
      preview: true,
      matches: results.map(r => ({
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
