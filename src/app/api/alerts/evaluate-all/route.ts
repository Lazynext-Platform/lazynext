import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AlertService } from '@/lib/services/alert-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/alerts/evaluate-all — evaluate all active alerts for an org.
 */
export async function POST(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ results: [] });
    }
    const organizationId = workspaces[0].organizationId;

    const results = await AlertService.evaluateAllAlerts(organizationId);
    return NextResponse.json({ results });
  } catch (e) {
    console.error('[alerts] evaluate-all error:', e);
    return NextResponse.json({ error: 'failed_to_evaluate_all_alerts' }, { status: 500 });
  }
}
