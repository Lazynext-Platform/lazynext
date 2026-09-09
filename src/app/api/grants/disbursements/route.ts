import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GrantService } from '@/lib/services/grant-service';

/** GET /api/grants/disbursements — list disbursements */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ disbursements: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { awardId?: string; status?: string } = {};
  const awardId = url.searchParams.get('awardId');
  const status = url.searchParams.get('status');
  if (awardId) opts.awardId = awardId;
  if (status) opts.status = status;

  const disbursements = await GrantService.listDisbursements(organizationId, opts as never);
  return NextResponse.json({ disbursements });
}

/** POST /api/grants/disbursements — create a disbursement */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const awardId = String(body.awardId || '').trim();
  const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);
  const date = String(body.date || '').trim();
  if (!awardId || isNaN(amount) || !date) {
    return NextResponse.json({ error: 'awardId_amount_date_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const disbursement = await GrantService.createDisbursement(
      ws.organizationId, ws.id,
      {
        awardId, amount, date, purpose: body.purpose, status: body.status,
        restrictions: body.restrictions, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ disbursement }, { status: 201 });
  } catch (e) {
    console.error('[grants/disbursements] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_disbursement' }, { status: 500 });
  }
}
