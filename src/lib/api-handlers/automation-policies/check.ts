import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { AutomationPolicyService } from '@/lib/automation/policy';

/**
 * POST /api/automation-policies/check — check if an automation can run under current policy.
 * Body: { automationId, organizationId? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { automationId?: string; organizationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const automationId = body.automationId?.trim();
  if (!automationId) {
    return NextResponse.json({ error: 'automationId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);

    // Verify ownership of the automation.
    const automation = await prisma.automation.findFirst({
      where: { id: automationId, workspaceId: { in: wsIds } },
      select: { id: true, workspaceId: true },
    });
    if (!automation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Resolve the organization id.
    const ws = workspaces.find((w) => w.id === automation.workspaceId);
    const orgId = body.organizationId ?? ws?.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'no_organization' }, { status: 400 });
    }

    const result = await AutomationPolicyService.checkPolicy(orgId, automationId);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[automation-policies/check] error:', e);
    return NextResponse.json({ error: 'failed_to_check_policy' }, { status: 500 });
  }
}
