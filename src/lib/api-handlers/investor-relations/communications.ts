import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** GET /api/investor-relations/communications — list communications */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ communications: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { investorId?: string; type?: string; status?: string } = {};
  const investorId = url.searchParams.get('investorId');
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (investorId) opts.investorId = investorId;
  if (type) opts.type = type;
  if (status) opts.status = status;

  const communications = await InvestorRelationsService.listCommunications(organizationId, opts as never);
  return NextResponse.json({ communications });
}

/** POST /api/investor-relations/communications — create a communication */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const investorId = String(body.investorId || '').trim();
  const type = String(body.type || '').trim();
  const subject = String(body.subject || '').trim();
  const date = String(body.date || '').trim();
  if (!investorId || !type || !subject || !date) {
    return NextResponse.json({ error: 'investor_id_type_subject_and_date_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const communication = await InvestorRelationsService.createCommunication(
      ws.organizationId, ws.id,
      {
        investorId, type: type as never, subject, date,
        summary: body.summary, outcome: body.outcome, followUp: body.followUp, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ communication }, { status: 201 });
  } catch (e) {
    console.error('[investor-relations/communications] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_communication' }, { status: 500 });
  }
}
