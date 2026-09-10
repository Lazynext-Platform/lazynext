import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/lineage — list lineage entries */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ lineage: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string } = {};
  const status = url.searchParams.get('status');
  if (status) opts.status = status;

  const lineage = await DataGovernanceService.listLineage(organizationId, opts as never);
  return NextResponse.json({ lineage });
}

/** POST /api/data-governance/lineage — create a lineage entry */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const source = String(body.source || '').trim();
  const target = String(body.target || '').trim();
  if (!name || !source || !target) {
    return NextResponse.json({ error: 'name_source_target_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const lineage = await DataGovernanceService.createLineage(
      ws.organizationId, ws.id,
      {
        name, source, target,
        transformation: body.transformation, schedule: body.schedule,
        status: body.status, dependencies: body.dependencies,
        dataVolume: body.dataVolume, lastUpdated: body.lastUpdated,
      },
      session.user.id,
    );
    return NextResponse.json({ lineage }, { status: 201 });
  } catch (e) {
    console.error('[data-governance/lineage] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_lineage' }, { status: 500 });
  }
}
