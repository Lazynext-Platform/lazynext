import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/churn-risks — list churn risks */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ churnRisks: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { customerId?: string; riskLevel?: string; status?: string } = {};
  const customerId = url.searchParams.get('customerId');
  const riskLevel = url.searchParams.get('riskLevel');
  const status = url.searchParams.get('status');
  if (customerId) opts.customerId = customerId;
  if (riskLevel) opts.riskLevel = riskLevel;
  if (status) opts.status = status;

  const churnRisks = await CustomerSuccessService.listChurnRisks(organizationId, opts as never);
  return NextResponse.json({ churnRisks });
}

/** POST /api/customer-success/churn-risks — create a churn risk */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const customerId = String(body.customerId || '').trim();
  const riskLevel = String(body.riskLevel || '').trim();
  if (!customerId || !riskLevel) {
    return NextResponse.json({ error: 'customerId_and_riskLevel_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const churnRisk = await CustomerSuccessService.createChurnRisk(
      ws.organizationId, ws.id,
      {
        customerId, riskLevel: riskLevel as never,
        reasons: body.reasons ?? [], signals: body.signals,
        mitigationPlan: body.mitigationPlan, assignedTo: body.assignedTo,
        status: body.status, identifiedDate: body.identifiedDate,
      },
      session.user.id,
    );
    return NextResponse.json({ churnRisk }, { status: 201 });
  } catch (e) {
    console.error('[customer-success/churn-risks] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_churn_risk' }, { status: 500 });
  }
}
