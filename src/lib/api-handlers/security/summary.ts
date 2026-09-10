import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SecurityService } from '@/lib/services/security';

/**
 * GET /api/security/summary — get security summary for a workspace.
 * Query params: workspaceId (required)
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id_required' }, { status: 400 });
  }

  try {
    const summary = await SecurityService.getSecuritySummary(workspaceId);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[security/summary] error:', e);
    return NextResponse.json({ error: 'failed_to_get_summary' }, { status: 500 });
  }
}
