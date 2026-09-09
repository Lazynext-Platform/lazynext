import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InnovationService } from '@/lib/services/innovation-service';

/** POST /api/innovation/ideas/[id]/advance — advance an idea to a new stage */
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
  const newStage = String(body.newStage || '').trim();
  if (!newStage) {
    return NextResponse.json({ error: 'newStage_required' }, { status: 400 });
  }

  try {
    const idea = await InnovationService.advanceIdea(id, newStage as never, session.user.id);
    if (!idea) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ idea });
  } catch (e) {
    console.error('[innovation/ideas/advance] error:', e);
    return NextResponse.json({ error: 'failed_to_advance_idea' }, { status: 500 });
  }
}
