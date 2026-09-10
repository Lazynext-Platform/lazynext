import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/carbon-emissions — list carbon emissions (query: organizationId, scope, period) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ emissions: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { scope?: number; period?: string } = {};
  const scope = sp.get('scope');
  const period = sp.get('period');
  if (scope) opts.scope = Number(scope);
  if (period) opts.period = period;

  const emissions = await SustainabilityService.listCarbonEmissions(organizationId, opts);
  return NextResponse.json({ emissions });
}

/** POST /api/sustainability/carbon-emissions — create a carbon emission */
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
  if (!body.scope || !body.source || body.amount === undefined || !body.unit || !body.period) {
    return NextResponse.json({ error: 'scope_source_amount_unit_period_required' }, { status: 400 });
  }

  try {
    const emission = await SustainabilityService.createCarbonEmission(
      organizationId,
      workspaceId,
      {
        scope: body.scope,
        source: body.source,
        amount: Number(body.amount),
        unit: body.unit,
        period: body.period,
        facility: body.facility,
        offset: body.offset !== undefined ? Number(body.offset) : undefined,
        netEmission: body.netEmission !== undefined ? Number(body.netEmission) : undefined,
      },
      session.user.id,
    );
    return NextResponse.json({ emission }, { status: 201 });
  } catch (e) {
    console.error('[sustainability/carbon-emissions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_carbon_emission' }, { status: 500 });
  }
}
