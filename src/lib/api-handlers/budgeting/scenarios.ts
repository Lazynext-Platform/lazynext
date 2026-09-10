import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BudgetingService, type ScenarioType } from '@/lib/services/budgeting-service';

/** GET /api/budgeting/scenarios — list scenarios */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ scenarios: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { period?: string; type?: ScenarioType } = {};
  const period = sp.get('period');
  const type = sp.get('type');
  if (period) opts.period = period;
  if (type) opts.type = type as ScenarioType;

  const scenarios = await BudgetingService.getScenarios(organizationId, opts);
  return NextResponse.json({ scenarios });
}

/** POST /api/budgeting/scenarios — create a scenario */
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
  if (!body.name || !body.type || !body.period || body.revenue === undefined || body.expenses === undefined) {
    return NextResponse.json({ error: 'name_type_period_revenue_expenses_required' }, { status: 400 });
  }

  try {
    const scenario = await BudgetingService.createScenario(
      organizationId,
      workspaceId,
      {
        name: body.name,
        type: body.type,
        period: body.period,
        revenue: Number(body.revenue),
        expenses: Number(body.expenses),
        growthRate: body.growthRate !== undefined ? Number(body.growthRate) : undefined,
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ scenario }, { status: 201 });
  } catch (e) {
    console.error('[budgeting] create scenario error:', e);
    return NextResponse.json({ error: 'failed_to_create_scenario' }, { status: 500 });
  }
}
