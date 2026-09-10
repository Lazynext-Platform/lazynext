import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SLOService } from '@/lib/services/slo-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/slos/summary — get SLO summary.
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
          met: 0,
          breached: 0,
          active: 0,
          paused: 0,
          avgErrorBudgetUsed: 0,
        },
      });
    }
    const organizationId = workspaces[0].organizationId;

    const summary = await SLOService.getSLOSummary(organizationId);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[slos] summary error:', e);
    return NextResponse.json({ error: 'failed_to_get_slo_summary' }, { status: 500 });
  }
}
