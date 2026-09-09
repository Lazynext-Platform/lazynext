import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BudgetingService } from '@/lib/services/budgeting-service';

/** GET /api/budgeting/forecasts — list forecasts */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ forecasts: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { period?: string } = {};
  const period = sp.get('period');
  if (period) opts.period = period;

  const forecasts = await BudgetingService.listForecasts(organizationId, opts);
  return NextResponse.json({ forecasts });
}

/** POST /api/budgeting/forecasts — create a forecast */
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
  if (!body.name || !body.period || !Array.isArray(body.scenarios)) {
    return NextResponse.json({ error: 'name_period_scenarios_required' }, { status: 400 });
  }

  try {
    const forecast = await BudgetingService.createForecast(
      organizationId,
      workspaceId,
      {
        name: body.name,
        period: body.period,
        scenarios: body.scenarios,
        assumptions: body.assumptions,
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ forecast }, { status: 201 });
  } catch (e) {
    console.error('[budgeting] create forecast error:', e);
    return NextResponse.json({ error: 'failed_to_create_forecast' }, { status: 500 });
  }
}
