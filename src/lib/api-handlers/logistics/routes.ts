import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LogisticsService } from '@/lib/services/logistics-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ routes: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'carrierId']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const routes = await LogisticsService.listRoutes(organizationId, opts as never);
  return NextResponse.json({ routes });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  const origin = String(body.origin || '').trim();
  const destination = String(body.destination || '').trim();
  if (!name || !type || !origin || !destination) return NextResponse.json({ error: 'name_type_origin_destination_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const route = await LogisticsService.createRoute(ws.organizationId, ws.id, {
      name, type: type as never, origin, destination,
      distance: body.distance, estimatedTime: body.estimatedTime,
      cost: body.cost, status: body.status, carrierId: body.carrierId,
      stops: body.stops, schedule: body.schedule, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ route }, { status: 201 });
  } catch (e) {
    console.error('[logistics/routes] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_route' }, { status: 500 });
  }
}
