import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/agreements — list agreements */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ agreements: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { franchiseeId?: string; status?: string; type?: string } = {};
  const franchiseeId = url.searchParams.get('franchiseeId');
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  if (franchiseeId) opts.franchiseeId = franchiseeId;
  if (status) opts.status = status;
  if (type) opts.type = type;

  const agreements = await FranchiseService.listAgreements(organizationId, opts as never);
  return NextResponse.json({ agreements });
}

/** POST /api/franchise/agreements — create an agreement */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const franchiseeId = String(body.franchiseeId || '').trim();
  const agreementNumber = String(body.agreementNumber || '').trim();
  const type = String(body.type || '').trim();
  const startDate = String(body.startDate || '').trim();
  if (!franchiseeId || !agreementNumber || !type || !startDate) {
    return NextResponse.json({ error: 'franchiseeId_agreementNumber_type_startDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const agreement = await FranchiseService.createAgreement(
      ws.organizationId, ws.id,
      {
        franchiseeId, agreementNumber, type: type as never, startDate,
        endDate: body.endDate, territory: body.territory,
        initialFee: body.initialFee, royaltyRate: body.royaltyRate,
        advertisingFundRate: body.advertisingFundRate,
        renewalTerms: body.renewalTerms, terminationConditions: body.terminationConditions,
        status: body.status, signedDate: body.signedDate, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ agreement }, { status: 201 });
  } catch (e) {
    console.error('[franchise/agreements] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_agreement' }, { status: 500 });
  }
}
