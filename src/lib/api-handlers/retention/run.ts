import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RetentionService } from '@/lib/services/retention-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/retention/run — execute all enabled retention policies.
 */
export async function POST(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ result: { policiesRun: 0, deleted: {} } });
    }
    const organizationId = workspaces[0].organizationId;

    const result = await RetentionService.runRetention(organizationId);
    return NextResponse.json({ result });
  } catch (e) {
    console.error('[retention] run error:', e);
    return NextResponse.json({ error: 'failed_to_run_retention' }, { status: 500 });
  }
}
