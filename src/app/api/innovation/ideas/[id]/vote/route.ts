import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InnovationService } from '@/lib/services/innovation-service';

/** POST /api/innovation/ideas/[id]/vote — vote for an idea */
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
  const voterId = String(body.voterId || session.user.id).trim();
  if (!voterId) {
    return NextResponse.json({ error: 'voterId_required' }, { status: 400 });
  }

  try {
    const idea = await InnovationService.voteForIdea(id, voterId);
    if (!idea) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ idea });
  } catch (e) {
    console.error('[innovation/ideas/vote] error:', e);
    return NextResponse.json({ error: 'failed_to_vote' }, { status: 500 });
  }
}
