import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** GET /api/portfolio/risks — list portfolio risks */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ risks: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { holdingId?: string; riskLevel?: string; status?: string } = {};
  const holdingId = url.searchParams.get('holdingId');
  const riskLevel = url.searchParams.get('riskLevel');
  const status = url.searchParams.get('status');
  if (holdingId) opts.holdingId = holdingId;
  if (riskLevel) opts.riskLevel = riskLevel;
  if (status) opts.status = status;

  const risks = await PortfolioService.listRisks(organizationId, opts as never);
  return NextResponse.json({ risks });
}

/** POST /api/portfolio/risks — create a portfolio risk */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const assessmentDate = String(body.assessmentDate || '').trim();
  const riskLevel = String(body.riskLevel || '').trim();
  if (!assessmentDate || !riskLevel) {
    return NextResponse.json({ error: 'assessmentDate_riskLevel_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const risk = await PortfolioService.createRisk(
      ws.organizationId, ws.id,
      {
        assessmentDate, riskLevel: riskLevel as never,
        name: body.name, status: body.status, varAmount: body.varAmount,
        beta: body.beta, sharpeRatio: body.sharpeRatio, maxDrawdown: body.maxDrawdown,
        volatility: body.volatility, concentration: body.concentration,
        mitigationPlan: body.mitigationPlan, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ risk }, { status: 201 });
  } catch (e) {
    console.error('[portfolio/risks] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_risk' }, { status: 500 });
  }
}
