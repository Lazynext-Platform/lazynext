import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InsuranceService } from '@/lib/services/insurance-service';

/** GET /api/insurance/policies — list policies (query: organizationId, type, status, provider) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ policies: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { type?: 'general_liability'|'property'|'cyber'|'professional_liability'|'workers_comp'|'auto'|'directors_officers'|'health'|'life'|'umbrella'|'other'; status?: 'active'|'expired'|'cancelled'|'pending'|'renewed'; provider?: string } = {};
  const type = sp.get('type');
  const status = sp.get('status');
  const provider = sp.get('provider');
  if (type) opts.type = type as typeof opts.type;
  if (status) opts.status = status as typeof opts.status;
  if (provider) opts.provider = provider;

  const policies = await InsuranceService.listPolicies(organizationId, opts);
  return NextResponse.json({ policies });
}

/** POST /api/insurance/policies — create a policy */
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
  if (!body.policyNumber || !body.type || !body.provider || !body.startDate) {
    return NextResponse.json({ error: 'policyNumber_type_provider_startDate_required' }, { status: 400 });
  }

  try {
    const policy = await InsuranceService.createPolicy(
      organizationId,
      workspaceId,
      {
        policyNumber: body.policyNumber,
        type: body.type,
        provider: body.provider,
        broker: body.broker,
        premium: body.premium !== undefined ? Number(body.premium) : undefined,
        deductible: body.deductible !== undefined ? Number(body.deductible) : undefined,
        coverageLimit: body.coverageLimit !== undefined ? Number(body.coverageLimit) : undefined,
        startDate: body.startDate,
        endDate: body.endDate,
        status: body.status,
        beneficiaries: body.beneficiaries,
      },
      session.user.id,
    );
    return NextResponse.json({ policy }, { status: 201 });
  } catch (e) {
    console.error('[insurance/policies] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_policy' }, { status: 500 });
  }
}
