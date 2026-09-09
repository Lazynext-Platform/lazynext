import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** GET /api/portfolio/risks/[id] — get a single portfolio risk */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const risk = await PortfolioService.getRisk(id);
  if (!risk) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ risk });
}

/** PATCH /api/portfolio/risks/[id] — update a portfolio risk */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const risk = await PortfolioService.updateRisk(id, {
      name: body.name, riskLevel: body.riskLevel, status: body.status,
      varAmount: body.varAmount, beta: body.beta, sharpeRatio: body.sharpeRatio,
      maxDrawdown: body.maxDrawdown, volatility: body.volatility,
      concentration: body.concentration, assessmentDate: body.assessmentDate,
      mitigationPlan: body.mitigationPlan, notes: body.notes,
    });
    if (!risk) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ risk });
  } catch (e) {
    console.error('[portfolio/risks] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_risk' }, { status: 500 });
  }
}

/** DELETE /api/portfolio/risks/[id] — delete a portfolio risk */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ok = await PortfolioService.deleteRisk(id);
  if (!ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
