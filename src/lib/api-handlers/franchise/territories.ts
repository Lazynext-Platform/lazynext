import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/territories — list territories */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ territories: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; assignedTo?: string } = {};
  const status = url.searchParams.get('status');
  const assignedTo = url.searchParams.get('assignedTo');
  if (status) opts.status = status;
  if (assignedTo) opts.assignedTo = assignedTo;

  const territories = await FranchiseService.listTerritories(organizationId, opts as never);
  return NextResponse.json({ territories });
}

/** POST /api/franchise/territories — create a territory */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const territory = await FranchiseService.createTerritory(
      ws.organizationId, ws.id,
      {
        name,
        description: body.description, boundaries: body.boundaries,
        population: body.population, demographics: body.demographics,
        marketPotential: body.marketPotential, existingLocations: body.existingLocations,
        exclusivity: body.exclusivity, status: body.status, assignedTo: body.assignedTo,
      },
      session.user.id,
    );
    return NextResponse.json({ territory }, { status: 201 });
  } catch (e) {
    console.error('[franchise/territories] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_territory' }, { status: 500 });
  }
}
