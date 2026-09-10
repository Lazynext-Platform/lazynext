import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** GET /api/investor-relations/investors — list investors */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ investors: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string; stage?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const stage = url.searchParams.get('stage');
  if (type) opts.type = type;
  if (status) opts.status = status;
  if (stage) opts.stage = stage;

  const investors = await InvestorRelationsService.listInvestors(organizationId, opts as never);
  return NextResponse.json({ investors });
}

/** POST /api/investor-relations/investors — create an investor */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) {
    return NextResponse.json({ error: 'name_and_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const investor = await InvestorRelationsService.createInvestor(
      ws.organizationId, ws.id,
      {
        name, type: type as never,
        firm: body.firm, email: body.email, phone: body.phone,
        investmentFocus: body.investmentFocus, checkSize: body.checkSize,
        stage: body.stage, portfolioCompanies: body.portfolioCompanies,
        status: body.status, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ investor }, { status: 201 });
  } catch (e) {
    console.error('[investor-relations/investors] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_investor' }, { status: 500 });
  }
}
