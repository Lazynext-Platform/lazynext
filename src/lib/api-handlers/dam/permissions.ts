import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DAMService } from '@/lib/services/dam-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ permissions: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['assetId', 'collectionId', 'type', 'level']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const permissions = await DAMService.listPermissions(organizationId, opts as never);
  return NextResponse.json({ permissions });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  const level = String(body.level || '').trim();
  if (!type || !level) return NextResponse.json({ error: 'type_level_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const permission = await DAMService.createPermission(ws.organizationId, ws.id, {
      type: type as never, level: level as never,
      assetId: body.assetId, collectionId: body.collectionId,
      grantedTo: body.grantedTo, grantedBy: body.grantedBy,
      grantedDate: body.grantedDate, expiresDate: body.expiresDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ permission }, { status: 201 });
  } catch (e) {
    console.error('[dam/permissions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_permission' }, { status: 500 });
  }
}
