import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RiskService } from '@/lib/services/risk-service';

/** POST /api/risks/[id]/assess — assess a risk (update likelihood/impact) */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  if (typeof body.likelihood !== 'number' || typeof body.impact !== 'number') {
    return NextResponse.json({ error: 'likelihood_impact_required' }, { status: 400 });
  }

  try {
    const risk = await RiskService.assess(id, body.likelihood, body.impact);
    if (!risk) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ risk });
  } catch (e) {
    console.error('[risks] assess error:', e);
    return NextResponse.json({ error: 'failed_to_assess_risk' }, { status: 500 });
  }
}
