import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BoardService } from '@/lib/services/board-service';

/** POST /api/board/resolutions/[id]/finalize — finalize a resolution */
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
  const outcome = String(body.outcome || '').trim();
  if (!outcome) {
    return NextResponse.json({ error: 'outcome_required' }, { status: 400 });
  }

  try {
    const resolution = await BoardService.finalizeResolution(id, outcome, session.user.id);
    if (!resolution) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ resolution });
  } catch (e) {
    console.error('[board/resolutions] finalize error:', e);
    return NextResponse.json({ error: 'failed_to_finalize_resolution' }, { status: 500 });
  }
}
