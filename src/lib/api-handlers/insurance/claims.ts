import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InsuranceService } from '@/lib/services/insurance-service';

/** GET /api/insurance/claims — list claims (query: organizationId, policyId, status) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ claims: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { policyId?: string; status?: 'filed'|'under_review'|'approved'|'denied'|'settled' } = {};
  const policyId = sp.get('policyId');
  const status = sp.get('status');
  if (policyId) opts.policyId = policyId;
  if (status) opts.status = status as typeof opts.status;

  const claims = await InsuranceService.listClaims(organizationId, opts);
  return NextResponse.json({ claims });
}

/** POST /api/insurance/claims — create a claim */
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
  if (!body.policyId || !body.incidentDate || !body.description || body.amount === undefined) {
    return NextResponse.json({ error: 'policyId_incidentDate_description_amount_required' }, { status: 400 });
  }

  try {
    const claim = await InsuranceService.createClaim(
      organizationId,
      workspaceId,
      {
        policyId: body.policyId,
        claimNumber: body.claimNumber,
        incidentDate: body.incidentDate,
        description: body.description,
        amount: Number(body.amount),
        status: body.status,
        adjuster: body.adjuster,
        filedBy: body.filedBy,
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ claim }, { status: 201 });
  } catch (e) {
    console.error('[insurance/claims] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_claim' }, { status: 500 });
  }
}
