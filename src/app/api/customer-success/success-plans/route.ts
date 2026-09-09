import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/success-plans — list success plans */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ successPlans: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { customerId?: string; status?: string; owner?: string } = {};
  const customerId = url.searchParams.get('customerId');
  const status = url.searchParams.get('status');
  const owner = url.searchParams.get('owner');
  if (customerId) opts.customerId = customerId;
  if (status) opts.status = status;
  if (owner) opts.owner = owner;

  const successPlans = await CustomerSuccessService.listSuccessPlans(organizationId, opts as never);
  return NextResponse.json({ successPlans });
}

/** POST /api/customer-success/success-plans — create a success plan */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const customerId = String(body.customerId || '').trim();
  const name = String(body.name || '').trim();
  if (!customerId || !name) {
    return NextResponse.json({ error: 'customerId_and_name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const successPlan = await CustomerSuccessService.createSuccessPlan(
      ws.organizationId, ws.id,
      {
        customerId, name, description: body.description,
        goals: body.goals ?? [], milestones: body.milestones,
        status: body.status, owner: body.owner,
        startDate: body.startDate, endDate: body.endDate,
      },
      session.user.id,
    );
    return NextResponse.json({ successPlan }, { status: 201 });
  } catch (e) {
    console.error('[customer-success/success-plans] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_success_plan' }, { status: 500 });
  }
}
