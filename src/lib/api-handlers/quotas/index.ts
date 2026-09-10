import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { QuotaService } from '@/lib/services/quota';

/**
 * GET /api/quotas — get usage summary for a workspace.
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

  // Verify workspace membership
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!membership) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const summary = await QuotaService.getUsageSummary(workspaceId);
    if (!summary) {
      return NextResponse.json({ error: 'workspace_not_found' }, { status: 404 });
    }
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[quotas] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_quotas' }, { status: 500 });
  }
}

/**
 * PATCH /api/quotas — update quota limits for a workspace (admin only).
 * Query params: workspaceId (required)
 * Body: { maxAgents?, maxTasks?, maxDocuments?, maxAutomations?, maxTickets?,
 *         maxStorageMb?, maxAgentRunsPerDay?, maxSandboxRunsPerDay? }
 */
export async function PATCH(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id_required' }, { status: 400 });
  }

  // Verify workspace membership with admin role
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!membership) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (membership.role !== 'admin' && membership.role !== 'owner') {
    return NextResponse.json(
      { error: 'forbidden', message: 'Requires admin or owner role' },
      { status: 403 },
    );
  }

  let body: {
    maxAgents?: number;
    maxTasks?: number;
    maxDocuments?: number;
    maxAutomations?: number;
    maxTickets?: number;
    maxStorageMb?: number;
    maxAgentRunsPerDay?: number;
    maxSandboxRunsPerDay?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const updated = await QuotaService.updateQuota(workspaceId, {
      maxAgents: body.maxAgents,
      maxTasks: body.maxTasks,
      maxDocuments: body.maxDocuments,
      maxAutomations: body.maxAutomations,
      maxTickets: body.maxTickets,
      maxStorageMb: body.maxStorageMb,
      maxAgentRunsPerDay: body.maxAgentRunsPerDay,
      maxSandboxRunsPerDay: body.maxSandboxRunsPerDay,
    });
    return NextResponse.json({ quota: updated });
  } catch (e) {
    console.error('[quotas] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_quotas' }, { status: 500 });
  }
}
