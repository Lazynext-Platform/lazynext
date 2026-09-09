import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** POST /api/customer-success/churn-risks/[id]/mitigate — mitigate a churn risk */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const mitigation = String(body.mitigation || '').trim();
  if (!mitigation) {
    return NextResponse.json({ error: 'mitigation_required' }, { status: 400 });
  }

  try {
    const churnRisk = await CustomerSuccessService.mitigateChurnRisk(id, mitigation, session.user.id);
    if (!churnRisk) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ churnRisk });
  } catch (e) {
    console.error('[customer-success/churn-risks/mitigate] error:', e);
    return NextResponse.json({ error: 'failed_to_mitigate_churn_risk' }, { status: 500 });
  }
}
