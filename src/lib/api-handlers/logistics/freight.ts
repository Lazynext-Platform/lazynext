import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LogisticsService } from '@/lib/services/logistics-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ freights: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['shipmentId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const freights = await LogisticsService.listFreights(organizationId, opts as never);
  return NextResponse.json({ freights });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  if (!type) return NextResponse.json({ error: 'type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const freight = await LogisticsService.createFreight(ws.organizationId, ws.id, {
      shipmentId: body.shipmentId, type: type as never,
      status: body.status, description: body.description,
      weight: body.weight, volume: body.volume,
      units: body.units, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ freight }, { status: 201 });
  } catch (e) {
    console.error('[logistics/freight] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_freight' }, { status: 500 });
  }
}
