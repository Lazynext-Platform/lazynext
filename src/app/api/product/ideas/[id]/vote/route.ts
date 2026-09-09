import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FeatureIdeaService } from '@/lib/services/product-management-service';

/** POST /api/product/ideas/[id]/vote — toggle vote on a feature idea */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const idea = await FeatureIdeaService.vote(id, session.user.id);
    return NextResponse.json({ idea });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_vote';
    if (msg === 'idea_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[product/ideas/vote] error:', e);
    return NextResponse.json({ error: 'failed_to_vote' }, { status: 500 });
  }
}
