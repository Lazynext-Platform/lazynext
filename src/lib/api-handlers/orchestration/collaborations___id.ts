import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OrchestrationService } from '@/lib/services/orchestration';

/**
 * GET /api/orchestration/collaborations/[id] — get a collaboration with participants and tasks.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await OrchestrationService.getCollaboration(id);
    if (!result.collaboration) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error('[orchestration] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_collaboration' }, { status: 500 });
  }
}
