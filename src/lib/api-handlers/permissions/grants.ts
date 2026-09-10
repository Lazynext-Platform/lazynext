import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PermissionService } from '@/lib/services/permission-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ grants: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'principalId', 'resourceId']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const grants = await PermissionService.listPermissionGrants(organizationId, opts as never);
  return NextResponse.json({ grants });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) return NextResponse.json({ error: 'name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const grant = await PermissionService.createPermissionGrant(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description,
      status: body.status,
      principalId: body.principalId,
      principalType: body.principalType,
      resourceId: body.resourceId,
      resourceType: body.resourceType,
      permissions: body.permissions,
      grantedBy: body.grantedBy,
      grantedAt: body.grantedAt,
      expiresAt: body.expiresAt,
      notes: body.notes
    }, session.user.id);
    return NextResponse.json({ grant }, { status: 201 });
  } catch (e) {
    console.error('[permissions/grants] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_grant' }, { status: 500 });
  }
}
