import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RetentionService } from '@/lib/services/retention-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/retention — list retention policies.
 */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ policies: [] });
    }
    const organizationId = workspaces[0].organizationId;

    const policies = await RetentionService.listPolicies(organizationId);
    return NextResponse.json({ policies });
  } catch (e) {
    console.error('[retention] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_policies' }, { status: 500 });
  }
}

/**
 * POST /api/retention — create a retention policy.
 * Body: { organizationId?, name, dataType, retentionDays?, action?, enabled? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    name?: string;
    dataType?: string;
    retentionDays?: number;
    action?: string;
    enabled?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }
  if (!body.dataType?.trim()) {
    return NextResponse.json({ error: 'dataType_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    let organizationId = body.organizationId?.trim();
    if (organizationId) {
      const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      organizationId = workspaces[0].organizationId;
    }

    const policy = await RetentionService.createPolicy(organizationId, {
      name: body.name.trim(),
      dataType: body.dataType.trim(),
      retentionDays: body.retentionDays,
      action: body.action,
      enabled: body.enabled,
    });
    return NextResponse.json({ policy }, { status: 201 });
  } catch (e) {
    console.error('[retention] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_policy' }, { status: 500 });
  }
}
