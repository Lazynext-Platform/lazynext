import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InsuranceService } from '@/lib/services/insurance-service';

/** GET /api/insurance/coverages — list coverages (query: organizationId, policyId) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ coverages: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { policyId?: string } = {};
  const policyId = sp.get('policyId');
  if (policyId) opts.policyId = policyId;

  const coverages = await InsuranceService.listCoverages(organizationId, opts);
  return NextResponse.json({ coverages });
}

/** POST /api/insurance/coverages — create a coverage */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  const workspaceId = body.workspaceId?.trim() || workspaces[0].id;
  if (!body.policyId || !body.name || !body.coveredPerils) {
    return NextResponse.json({ error: 'policyId_name_coveredPerils_required' }, { status: 400 });
  }

  try {
    const coverage = await InsuranceService.createCoverage(
      organizationId,
      workspaceId,
      {
        policyId: body.policyId,
        name: body.name,
        description: body.description,
        coveredPerils: body.coveredPerils,
        exclusions: body.exclusions,
        limit: body.limit !== undefined ? Number(body.limit) : undefined,
        sublimits: body.sublimits,
      },
      session.user.id,
    );
    return NextResponse.json({ coverage }, { status: 201 });
  } catch (e) {
    console.error('[insurance/coverages] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_coverage' }, { status: 500 });
  }
}
