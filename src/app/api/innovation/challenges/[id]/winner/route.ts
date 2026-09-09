import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InnovationService } from '@/lib/services/innovation-service';

/** POST /api/innovation/challenges/[id]/winner — select a winner for a challenge */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const winnerId = String(body.winnerId || '').trim();
  if (!winnerId) {
    return NextResponse.json({ error: 'winnerId_required' }, { status: 400 });
  }

  try {
    const challenge = await InnovationService.selectWinner(id, winnerId, session.user.id);
    if (!challenge) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ challenge });
  } catch (e) {
    console.error('[innovation/challenges/winner] error:', e);
    return NextResponse.json({ error: 'failed_to_select_winner' }, { status: 500 });
  }
}
