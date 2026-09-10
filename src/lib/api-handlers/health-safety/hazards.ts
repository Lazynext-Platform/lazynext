import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** GET /api/health-safety/hazards — list hazards */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ hazards: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; riskLevel?: string; status?: string; location?: string } = {};
  const category = url.searchParams.get('category');
  const riskLevel = url.searchParams.get('riskLevel');
  const status = url.searchParams.get('status');
  const location = url.searchParams.get('location');
  if (category) opts.category = category;
  if (riskLevel) opts.riskLevel = riskLevel;
  if (status) opts.status = status;
  if (location) opts.location = location;

  const hazards = await HealthSafetyService.listHazards(organizationId, opts as never);
  return NextResponse.json({ hazards });
}

/** POST /api/health-safety/hazards — create a hazard */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const category = String(body.category || '').trim();
  const riskLevel = String(body.riskLevel || '').trim();
  if (!title || !category || !riskLevel) {
    return NextResponse.json({ error: 'title_category_riskLevel_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const hazard = await HealthSafetyService.createHazard(
      ws.organizationId, ws.id,
      {
        title, category: category as never, riskLevel: riskLevel as never,
        description: body.description, location: body.location,
        identifiedBy: body.identifiedBy, identifiedDate: body.identifiedDate,
        mitigation: body.mitigation, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ hazard }, { status: 201 });
  } catch (e) {
    console.error('[health-safety/hazards] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_hazard' }, { status: 500 });
  }
}
