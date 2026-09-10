import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CreativeIntegrationService } from '@/lib/services/creative-integration';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/creative-integration/sync — sync creative performance to OS memory/events.
 */
export async function POST(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    const ws = workspaces[0];
    const result = await CreativeIntegrationService.syncPerformanceToMemory(
      ws.id,
      ws.organizationId,
      session.user.id,
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('[creative-integration/sync] error:', e);
    return NextResponse.json({ error: 'failed_to_sync' }, { status: 500 });
  }
}
