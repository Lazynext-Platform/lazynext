import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** GET /api/document-management/retention — list retention policies */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ policies: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const policies = await DocumentManagementService.getRetentionPolicies(organizationId);
  return NextResponse.json({ policies });
}

/** POST /api/document-management/retention — create a retention policy */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const action = String(body.action || '').trim();
  const retentionDays = Number(body.retentionDays ?? 0);
  if (!name || !action) {
    return NextResponse.json({ error: 'name_and_action_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const policy = await DocumentManagementService.createRetentionPolicy(
      ws.organizationId,
      ws.id,
      { name, category: body.category, retentionDays, action: action as never, description: body.description },
      session.user.id,
    );
    return NextResponse.json({ policy }, { status: 201 });
  } catch (e) {
    console.error('[document-management/retention] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_retention_policy' }, { status: 500 });
  }
}
