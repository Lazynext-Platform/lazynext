import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OrchestrationService } from '@/lib/services/orchestration';

/**
 * GET /api/orchestration/collaborations/[id]/status — get collaboration status.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const status = await OrchestrationService.getCollaborationStatus(id);
    if (!status.collaboration) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(status);
  } catch (e) {
    console.error('[orchestration] status error:', e);
    return NextResponse.json({ error: 'failed_to_get_status' }, { status: 500 });
  }
}
