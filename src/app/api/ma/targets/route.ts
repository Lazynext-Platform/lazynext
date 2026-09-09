import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MAService } from '@/lib/services/ma-service';

/** GET /api/ma/targets — list M&A targets */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ targets: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { industry?: string; status?: string; location?: string } = {};
  const industry = url.searchParams.get('industry');
  const status = url.searchParams.get('status');
  const location = url.searchParams.get('location');
  if (industry) opts.industry = industry;
  if (status) opts.status = status;
  if (location) opts.location = location;

  const targets = await MAService.listTargets(organizationId, opts as never);
  return NextResponse.json({ targets });
}

/** POST /api/ma/targets — create an M&A target */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const industry = String(body.industry || '').trim();
  if (!name || !industry) {
    return NextResponse.json({ error: 'name_and_industry_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const target = await MAService.createTarget(
      ws.organizationId, ws.id,
      {
        name, industry,
        location: body.location, revenue: body.revenue, employees: body.employees,
        description: body.description, website: body.website,
        ownershipType: body.ownershipType, strategicFit: body.strategicFit,
        status: body.status, contactName: body.contactName, contactEmail: body.contactEmail,
      },
      session.user.id,
    );
    return NextResponse.json({ target }, { status: 201 });
  } catch (e) {
    console.error('[ma/targets] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_target' }, { status: 500 });
  }
}
