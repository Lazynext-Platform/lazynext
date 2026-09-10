import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateArchivesService } from '@/lib/services/corporate-archives-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ records: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'collectionId']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const records = await CorporateArchivesService.listRecords(organizationId, opts as never);
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  if (!title || !type) return NextResponse.json({ error: 'title_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const record = await CorporateArchivesService.createRecord(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, status: body.status, collectionId: body.collectionId,
      dateCreated: body.dateCreated, dateArchived: body.dateArchived, retentionPeriod: body.retentionPeriod,
      location: body.location, boxNumber: body.boxNumber, folderNumber: body.folderNumber,
      format: body.format, restricted: body.restricted, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    console.error('[corporate-archives/records] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_record' }, { status: 500 });
  }
}
