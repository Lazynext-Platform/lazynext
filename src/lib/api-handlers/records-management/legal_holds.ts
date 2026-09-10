import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecordsManagementService } from '@/lib/services/records-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ legalHolds: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const legalHolds = await RecordsManagementService.listLegalHolds(organizationId, opts as never);
  return NextResponse.json({ legalHolds });
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
    const legalHold = await RecordsManagementService.createLegalHold(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, status: body.status,
      issuedBy: body.issuedBy, issuedDate: body.issuedDate,
      releasedDate: body.releasedDate, matterNumber: body.matterNumber,
      scope: body.scope, affectedItems: body.affectedItems,
      notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ legalHold }, { status: 201 });
  } catch (e) {
    console.error('[records-management/legal-holds] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_legal_hold' }, { status: 500 });
  }
}
