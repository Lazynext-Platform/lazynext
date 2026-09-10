import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DAMService } from '@/lib/services/dam-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ assets: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'owner']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const assets = await DAMService.listAssets(organizationId, opts as never);
  return NextResponse.json({ assets });
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
    const asset = await DAMService.createAsset(ws.organizationId, ws.id, {
      name, type: type as never,
      url: body.url, description: body.description, tags: body.tags,
      status: body.status, fileSize: body.fileSize, fileType: body.fileType,
      checksum: body.checksum, uploadedBy: body.uploadedBy, owner: body.owner,
      license: body.license, expiryDate: body.expiryDate, metadata: body.metadata, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (e) {
    console.error('[dam/assets] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_asset' }, { status: 500 });
  }
}
