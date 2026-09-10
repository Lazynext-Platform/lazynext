import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MAService } from '@/lib/services/ma-service';

/** GET /api/ma/due-diligence — list due diligence records */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ dueDiligence: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { dealId?: string; status?: string } = {};
  const dealId = url.searchParams.get('dealId');
  const status = url.searchParams.get('status');
  if (dealId) opts.dealId = dealId;
  if (status) opts.status = status;

  const dueDiligence = await MAService.listDueDiligence(organizationId, opts as never);
  return NextResponse.json({ dueDiligence });
}

/** POST /api/ma/due-diligence — create a due diligence record */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dealId = String(body.dealId || '').trim();
  const areas = body.areas;
  if (!dealId || !Array.isArray(areas) || areas.length === 0) {
    return NextResponse.json({ error: 'dealId_and_areas_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const dd = await MAService.createDueDiligence(
      ws.organizationId, ws.id,
      { dealId, areas, status: body.status, startDate: body.startDate, endDate: body.endDate },
      session.user.id,
    );
    return NextResponse.json({ dueDiligence: dd }, { status: 201 });
  } catch (e) {
    console.error('[ma/due-diligence] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_due_diligence' }, { status: 500 });
  }
}
