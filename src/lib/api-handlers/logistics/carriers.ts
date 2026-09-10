import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LogisticsService } from '@/lib/services/logistics-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ carriers: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const carriers = await LogisticsService.listCarriers(organizationId, opts as never);
  return NextResponse.json({ carriers });
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
    const carrier = await LogisticsService.createCarrier(ws.organizationId, ws.id, {
      name, type: type as never,
      status: body.status, contact: body.contact,
      phone: body.phone, email: body.email,
      rating: body.rating, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ carrier }, { status: 201 });
  } catch (e) {
    console.error('[logistics/carriers] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_carrier' }, { status: 500 });
  }
}
