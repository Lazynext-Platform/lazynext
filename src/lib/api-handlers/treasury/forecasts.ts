import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TreasuryService } from '@/lib/services/treasury-service';

/** GET /api/treasury/forecasts — list forecasts (query: organizationId, period) */
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
  const period = sp.get('period') || undefined;

  const forecasts = await TreasuryService.listForecasts(organizationId, { period });
  return NextResponse.json({ forecasts });
}

/** POST /api/treasury/forecasts — create a cash flow forecast */
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
  if (!body.period || !Array.isArray(body.expectedInflows) || !Array.isArray(body.expectedOutflows)) {
    return NextResponse.json({ error: 'period_inflows_outflows_required' }, { status: 400 });
  }

  try {
    const forecast = await TreasuryService.createForecast(
      organizationId,
      workspaceId,
      {
        period: body.period,
        expectedInflows: body.expectedInflows,
        expectedOutflows: body.expectedOutflows,
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ forecast }, { status: 201 });
  } catch (e) {
    console.error('[treasury/forecasts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_forecast' }, { status: 500 });
  }
}
