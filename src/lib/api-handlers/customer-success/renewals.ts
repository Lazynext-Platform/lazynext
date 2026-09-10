import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/renewals — list renewals */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ renewals: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { customerId?: string; status?: string } = {};
  const customerId = url.searchParams.get('customerId');
  const status = url.searchParams.get('status');
  if (customerId) opts.customerId = customerId;
  if (status) opts.status = status;

  const renewals = await CustomerSuccessService.listRenewals(organizationId, opts as never);
  return NextResponse.json({ renewals });
}

/** POST /api/customer-success/renewals — create a renewal */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const customerId = String(body.customerId || '').trim();
  const renewalDate = String(body.renewalDate || '').trim();
  if (!customerId || !renewalDate) {
    return NextResponse.json({ error: 'customerId_and_renewalDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const renewal = await CustomerSuccessService.createRenewal(
      ws.organizationId, ws.id,
      {
        customerId, contractId: body.contractId, currentMrr: body.currentMrr,
        renewalDate, renewalValue: body.renewalValue, termMonths: body.termMonths,
        status: body.status, probability: body.probability, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ renewal }, { status: 201 });
  } catch (e) {
    console.error('[customer-success/renewals] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_renewal' }, { status: 500 });
  }
}
