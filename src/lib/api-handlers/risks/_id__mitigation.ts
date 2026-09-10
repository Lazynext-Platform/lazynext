import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RiskService } from '@/lib/services/risk-service';

/** POST /api/risks/[id]/mitigation — set mitigation plan */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan ?? body.mitigationPlan ?? '').trim();
  if (!plan) {
    return NextResponse.json({ error: 'plan_required' }, { status: 400 });
  }

  try {
    const risk = await RiskService.setMitigationPlan(id, plan);
    if (!risk) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ risk });
  } catch (e) {
    console.error('[risks] mitigation error:', e);
    return NextResponse.json({ error: 'failed_to_set_mitigation' }, { status: 500 });
  }
}
