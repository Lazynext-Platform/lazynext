import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EngagementService } from '@/lib/services/engagement-service';

/** POST /api/engagement/actions/[id]/start — start an action */
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
    const action = await EngagementService.startAction(id, session.user.id);
    if (!action) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ action });
  } catch (e) {
    console.error('[engagement/actions/start] error:', e);
    return NextResponse.json({ error: 'failed_to_start_action' }, { status: 500 });
  }
}
