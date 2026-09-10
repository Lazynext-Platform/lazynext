import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CreativeIntegrationService } from '@/lib/services/creative-integration';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/creative-integration/dashboard — combined growth/marketing dashboard.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ dashboard: null });
    }

    let wsId = workspaceId;
    let orgId: string;
    if (wsId) {
      const ws = workspaces.find((w) => w.id === wsId);
      if (!ws) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      orgId = ws.organizationId;
    } else {
      wsId = workspaces[0].id;
      orgId = workspaces[0].organizationId;
    }

    const dashboard = await CreativeIntegrationService.getGrowthDashboard(
      wsId,
      orgId,
      session.user.id,
    );
    return NextResponse.json({ dashboard });
  } catch (e) {
    console.error('[creative-integration/dashboard] error:', e);
    return NextResponse.json({ error: 'failed_to_get_dashboard' }, { status: 500 });
  }
}
