import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovernanceService } from '@/lib/services/governance';

/**
 * GET /api/governance/policies/[id] — get a single policy.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const policy = await GovernanceService.getPolicy(id);
    if (!policy) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[governance/policies] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_policy' }, { status: 500 });
  }
}

/**
 * PATCH /api/governance/policies/[id] — update a policy (increments version).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: {
    workspaceId?: string | null;
    title?: string;
    description?: string | null;
    type?: string;
    status?: string;
    rules?: unknown[];
    effectiveFrom?: string;
    effectiveUntil?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const policy = await GovernanceService.updatePolicy(id, {
      workspaceId: body.workspaceId !== undefined ? body.workspaceId : undefined,
      title: body.title,
      description: body.description,
      type: body.type as 'operational' | 'financial' | 'security' | 'privacy' | 'data_retention' | 'approval' | 'spending' | undefined,
      status: body.status as 'active' | 'draft' | 'archived' | 'superseded' | undefined,
      rules: body.rules,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
      effectiveUntil: body.effectiveUntil ? new Date(body.effectiveUntil) : undefined,
    });
    if (!policy) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[governance/policies] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_policy' }, { status: 500 });
  }
}

/**
 * DELETE /api/governance/policies/[id] — archive a policy.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const policy = await GovernanceService.archivePolicy(id);
    if (!policy) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[governance/policies] archive error:', e);
    return NextResponse.json({ error: 'failed_to_archive_policy' }, { status: 500 });
  }
}
