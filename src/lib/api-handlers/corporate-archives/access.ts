import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateArchivesService } from '@/lib/services/corporate-archives-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ access: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const access = await CorporateArchivesService.listAccess(organizationId, opts as never);
  return NextResponse.json({ access });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const requester = String(body.requester || '').trim();
  const type = String(body.type || '').trim();
  if (!requester || !type) return NextResponse.json({ error: 'requester_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const access = await CorporateArchivesService.createAccess(ws.organizationId, ws.id, {
      requester, type: type as never,
      recordId: body.recordId, collectionId: body.collectionId,
      description: body.description, status: body.status,
      requestDate: body.requestDate, approvalDate: body.approvalDate, fulfillmentDate: body.fulfillmentDate,
      purpose: body.purpose, restrictions: body.restrictions, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ access }, { status: 201 });
  } catch (e) {
    console.error('[corporate-archives/access] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_access' }, { status: 500 });
  }
}
