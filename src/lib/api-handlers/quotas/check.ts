import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { QuotaService } from '@/lib/services/quota';

/**
 * GET /api/quotas/check — check a specific quota for a workspace.
 * Query params: workspaceId (required), resource (required)
 * resource: agents | tasks | documents | automations | tickets | agentRuns | sandboxRuns
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const resource = url.searchParams.get('resource');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id_required' }, { status: 400 });
  }
  if (!resource) {
    return NextResponse.json({ error: 'resource_required' }, { status: 400 });
  }

  const validResources = ['agents', 'tasks', 'documents', 'automations', 'tickets', 'agentRuns', 'sandboxRuns'];
  if (!validResources.includes(resource)) {
    return NextResponse.json(
      { error: 'invalid_resource', message: `Must be one of: ${validResources.join(', ')}` },
      { status: 400 },
    );
  }

  // Verify workspace membership
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!membership) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    let result;
    switch (resource) {
      case 'agents':
        result = await QuotaService.checkAgentQuota(workspaceId);
        break;
      case 'tasks':
        result = await QuotaService.checkTaskQuota(workspaceId);
        break;
      case 'documents':
        result = await QuotaService.checkDocumentQuota(workspaceId);
        break;
      case 'automations':
        result = await QuotaService.checkAutomationQuota(workspaceId);
        break;
      case 'tickets':
        result = await QuotaService.checkTicketQuota(workspaceId);
        break;
      case 'agentRuns':
        result = await QuotaService.checkAgentRunQuota(workspaceId);
        break;
      case 'sandboxRuns':
        result = await QuotaService.checkSandboxRunQuota(workspaceId);
        break;
      default:
        return NextResponse.json({ error: 'invalid_resource' }, { status: 400 });
    }

    return NextResponse.json({ resource, ...result });
  } catch (e) {
    console.error('[quotas/check] error:', e);
    return NextResponse.json({ error: 'failed_to_check_quota' }, { status: 500 });
  }
}
