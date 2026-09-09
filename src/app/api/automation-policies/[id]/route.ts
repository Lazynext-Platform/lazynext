import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AutomationPolicyService } from '@/lib/automation/policy';

/**
 * GET /api/automation-policies/[id] — get a single policy.
 * PATCH /api/automation-policies/[id] — update a policy.
 * DELETE /api/automation-policies/[id] — delete a policy.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const policy = await AutomationPolicyService.getPolicy(id);
    if (!policy) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Verify the user belongs to the policy's organization.
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const orgIds = new Set(workspaces.map((w) => w.organizationId));
    if (!orgIds.has(policy.organizationId)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[automation-policies] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_policy' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
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
    const existing = await AutomationPolicyService.getPolicy(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const orgIds = new Set(workspaces.map((w) => w.organizationId));
    if (!orgIds.has(existing.organizationId)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const policy = await AutomationPolicyService.updatePolicy(id, body);
    return NextResponse.json({ policy });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_update_policy';
    if (msg === 'policy_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[automation-policies] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_policy' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const existing = await AutomationPolicyService.getPolicy(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const orgIds = new Set(workspaces.map((w) => w.organizationId));
    if (!orgIds.has(existing.organizationId)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await AutomationPolicyService.deletePolicy(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[automation-policies] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_policy' }, { status: 500 });
  }
}
