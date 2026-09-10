import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AlertService } from '@/lib/services/alert-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/alerts/summary — get alert summary.
 */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({
        summary: {
          total: 0,
          byStatus: {},
          bySeverity: {},
          recentTriggers: 0,
          activeCount: 0,
          criticalCount: 0,
          warningCount: 0,
          resolvedCount: 0,
        },
      });
    }
    const organizationId = workspaces[0].organizationId;

    const summary = await AlertService.getAlertSummary(organizationId);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[alerts] summary error:', e);
    return NextResponse.json({ error: 'failed_to_get_alert_summary' }, { status: 500 });
  }
}
