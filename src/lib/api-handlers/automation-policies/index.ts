import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AutomationPolicyService } from '@/lib/automation/policy';

/**
 * GET /api/automation-policies — list automation policies for the user's org.
 * POST /api/automation-policies — create an automation policy.
 */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const orgIds = [...new Set(workspaces.map((w) => w.organizationId))];
    if (orgIds.length === 0) {
      return NextResponse.json({ policies: [] });
    }

    const results = await Promise.all(orgIds.map((orgId) => AutomationPolicyService.listPolicies(orgId)));
    const policies = results.flat();
    return NextResponse.json({ policies });
  } catch (e) {
    console.error('[automation-policies] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_policies' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    name?: string;
    maxConcurrentRuns?: number;
    maxRunsPerHour?: number;
    maxRunsPerDay?: number;
    enabledActions?: string[];
    blockedActions?: string[];
    retryPolicy?: { maxAttempts?: number; initialDelayMs?: number; maxDelayMs?: number; backoffMultiplier?: number };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const orgIds = [...new Set(workspaces.map((w) => w.organizationId))];
    const orgId = body.organizationId && orgIds.includes(body.organizationId)
      ? body.organizationId
      : orgIds[0];

    if (!orgId) {
      return NextResponse.json({ error: 'no_organization' }, { status: 400 });
    }

    const policy = await AutomationPolicyService.createPolicy(orgId, {
      name: body.name ?? '',
      maxConcurrentRuns: body.maxConcurrentRuns,
      maxRunsPerHour: body.maxRunsPerHour,
      maxRunsPerDay: body.maxRunsPerDay,
      enabledActions: body.enabledActions,
      blockedActions: body.blockedActions,
      retryPolicy: body.retryPolicy,
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_create_policy';
    if (msg === 'policy_name_required') {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error('[automation-policies] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_policy' }, { status: 500 });
  }
}
