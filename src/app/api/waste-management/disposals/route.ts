import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WasteManagementService } from '@/lib/services/waste-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ disposals: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['streamId', 'vendorId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const disposals = await WasteManagementService.listWasteDisposals(organizationId, opts as never);
  return NextResponse.json({ disposals });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const description = String(body.description || '').trim();
  const type = String(body.type || '').trim();
  if (!description || !type) return NextResponse.json({ error: 'description_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const disposal = await WasteManagementService.createWasteDisposal(ws.organizationId, ws.id, {
      streamId: body.streamId, vendorId: body.vendorId, type: type as never,
      description, status: body.status,
      volume: body.volume, unit: body.unit,
      scheduledDate: body.scheduledDate, executedDate: body.executedDate,
      cost: body.cost, manifest: body.manifest, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ disposal }, { status: 201 });
  } catch (e) {
    console.error('[waste-management/disposals] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_disposal' }, { status: 500 });
  }
}
