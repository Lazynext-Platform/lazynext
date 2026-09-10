import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/churn-risks/[id] — get a single churn risk */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const churnRisk = await CustomerSuccessService.getChurnRisk(id);
  if (!churnRisk) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ churnRisk });
}

/** PATCH /api/customer-success/churn-risks/[id] — update a churn risk */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const churnRisk = await CustomerSuccessService.updateChurnRisk(id, {
      riskLevel: body.riskLevel, reasons: body.reasons, signals: body.signals,
      mitigationPlan: body.mitigationPlan, assignedTo: body.assignedTo,
      status: body.status, identifiedDate: body.identifiedDate,
    });
    if (!churnRisk) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ churnRisk });
  } catch (e) {
    console.error('[customer-success/churn-risks] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_churn_risk' }, { status: 500 });
  }
}
