import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovernanceService } from '@/lib/services/governance';

/**
 * GET /api/governance/policies — list policies for an organization.
 * Query params: organizationId (required), type, status, workspaceId, limit
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const organizationId = url.searchParams.get('organizationId');
  if (!organizationId) {
    return NextResponse.json({ error: 'organization_id_required' }, { status: 400 });
  }

  const type = url.searchParams.get('type') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const workspaceId = url.searchParams.get('workspaceId') || undefined;
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50;

  try {
    const policies = await GovernanceService.listPolicies(organizationId, {
      type: type as 'operational' | 'financial' | 'security' | 'privacy' | 'data_retention' | 'approval' | 'spending' | undefined,
      status: status as 'active' | 'draft' | 'archived' | 'superseded' | undefined,
      workspaceId: workspaceId || undefined,
      limit,
    });
    return NextResponse.json({ policies });
  } catch (e) {
    console.error('[governance/policies] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_policies' }, { status: 500 });
  }
}

/**
 * POST /api/governance/policies — create a policy.
 * Body: { organizationId, workspaceId?, title, description?, type?, status?, rules?, ... }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string | null;
    title?: string;
    description?: string | null;
    type?: string;
    status?: string;
    rules?: unknown[];
    effectiveFrom?: string;
    effectiveUntil?: string | null;
    createdBy?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.organizationId || !body.title) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  try {
    const policy = await GovernanceService.createPolicy(body.organizationId, {
      workspaceId: body.workspaceId || null,
      title: body.title,
      description: body.description || null,
      type: body.type as 'operational' | 'financial' | 'security' | 'privacy' | 'data_retention' | 'approval' | 'spending' | undefined,
      status: body.status as 'active' | 'draft' | 'archived' | 'superseded' | undefined,
      rules: body.rules,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
      effectiveUntil: body.effectiveUntil ? new Date(body.effectiveUntil) : null,
      createdBy: body.createdBy || session.user.id,
    });
    if (!policy) {
      return NextResponse.json({ error: 'failed_to_create_policy' }, { status: 500 });
    }
    return NextResponse.json({ policy }, { status: 201 });
  } catch (e) {
    console.error('[governance/policies] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_policy' }, { status: 500 });
  }
}
