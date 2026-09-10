import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateLibraryService } from '@/lib/services/corporate-library-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ acquisitions: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const acquisitions = await CorporateLibraryService.listAcquisitions(organizationId, opts as never);
  return NextResponse.json({ acquisitions });
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
    const acquisition = await CorporateLibraryService.createAcquisition(ws.organizationId, ws.id, {
      title, type: type as never,
      author: body.author, publisher: body.publisher,
      cost: body.cost, budget: body.budget,
      status: body.status, requestedBy: body.requestedBy, approvedBy: body.approvedBy,
      orderedDate: body.orderedDate, receivedDate: body.receivedDate,
      supplier: body.supplier, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ acquisition }, { status: 201 });
  } catch (e) {
    console.error('[corporate-library/acquisitions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_acquisition' }, { status: 500 });
  }
}
