import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecordsManagementService } from '@/lib/services/records-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ disposals: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['itemId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const disposals = await RecordsManagementService.listDisposals(organizationId, opts as never);
  return NextResponse.json({ disposals });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || '').trim();
  const type = String(body.type || '').trim();
  if (!itemId || !type) return NextResponse.json({ error: 'itemId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const disposal = await RecordsManagementService.createDisposal(ws.organizationId, ws.id, {
      itemId, type: type as never,
      description: body.description, status: body.status,
      scheduledDate: body.scheduledDate, executedDate: body.executedDate,
      approvedBy: body.approvedBy, method: body.method,
      witness: body.witness, certificate: body.certificate,
      notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ disposal }, { status: 201 });
  } catch (e) {
    console.error('[records-management/disposals] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_disposal' }, { status: 500 });
  }
}
