import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BoardService } from '@/lib/services/board-service';

/** POST /api/board/resolutions/[id]/vote — cast a vote */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const member = String(body.member || '').trim();
  const vote = String(body.vote || '').trim();
  if (!member || !vote) {
    return NextResponse.json({ error: 'member_and_vote_required' }, { status: 400 });
  }

  try {
    const resolution = await BoardService.castVote(id, member, vote as never);
    if (!resolution) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ resolution });
  } catch (e) {
    console.error('[board/resolutions] vote error:', e);
    return NextResponse.json({ error: 'failed_to_cast_vote' }, { status: 500 });
  }
}
