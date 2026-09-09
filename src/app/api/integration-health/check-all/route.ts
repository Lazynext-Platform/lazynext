import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IntegrationHealthMonitor } from '@/lib/automation/health-monitor';

/**
 * POST /api/integration-health/check-all — check all integrations for an org.
 * Body: { organizationId? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { organizationId?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const orgIds = [...new Set(workspaces.map((w) => w.organizationId))];
    const orgId = body.organizationId && orgIds.includes(body.organizationId)
      ? body.organizationId
      : orgIds[0];

    if (!orgId) {
      return NextResponse.json({ results: [] });
    }

    const results = await IntegrationHealthMonitor.checkAllIntegrations(orgId);
    return NextResponse.json({ results });
  } catch (e) {
    console.error('[integration-health/check-all] error:', e);
    return NextResponse.json({ error: 'failed_to_check_integrations' }, { status: 500 });
  }
}
