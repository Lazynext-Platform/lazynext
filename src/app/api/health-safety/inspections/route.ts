import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** GET /api/health-safety/inspections — list inspections */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ inspections: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { area?: string; status?: string; inspector?: string } = {};
  const area = url.searchParams.get('area');
  const status = url.searchParams.get('status');
  const inspector = url.searchParams.get('inspector');
  if (area) opts.area = area;
  if (status) opts.status = status;
  if (inspector) opts.inspector = inspector;

  const inspections = await HealthSafetyService.listInspections(organizationId, opts as never);
  return NextResponse.json({ inspections });
}

/** POST /api/health-safety/inspections — create an inspection */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const area = String(body.area || '').trim();
  const inspector = String(body.inspector || '').trim();
  const date = String(body.date || '').trim();
  if (!title || !area || !inspector || !date) {
    return NextResponse.json({ error: 'title_area_inspector_date_required' }, { status: 400 });
  }
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: 'items_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const inspection = await HealthSafetyService.createInspection(
      ws.organizationId, ws.id,
      { title, area, inspector, date, items: body.items, status: body.status },
      session.user.id,
    );
    return NextResponse.json({ inspection }, { status: 201 });
  } catch (e) {
    console.error('[health-safety/inspections] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_inspection' }, { status: 500 });
  }
}
