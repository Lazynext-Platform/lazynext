import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DAMService } from '@/lib/services/dam-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ versions: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  const v = url.searchParams.get('assetId'); if (v) opts.assetId = v;
  const versions = await DAMService.listVersions(organizationId, opts as never);
  return NextResponse.json({ versions });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const assetId = String(body.assetId || '').trim();
  const version = String(body.version || '').trim();
  if (!assetId || !version) return NextResponse.json({ error: 'assetId_version_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const ver = await DAMService.createVersion(ws.organizationId, ws.id, {
      assetId, version,
      url: body.url, fileSize: body.fileSize, fileType: body.fileType,
      checksum: body.checksum, uploadedBy: body.uploadedBy,
      changeLog: body.changeLog, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ version: ver }, { status: 201 });
  } catch (e) {
    console.error('[dam/versions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_version' }, { status: 500 });
  }
}
