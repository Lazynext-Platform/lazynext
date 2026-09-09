import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/touchpoints — list touchpoints */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ touchpoints: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { customerId?: string; type?: string; sentiment?: string } = {};
  const customerId = url.searchParams.get('customerId');
  const type = url.searchParams.get('type');
  const sentiment = url.searchParams.get('sentiment');
  if (customerId) opts.customerId = customerId;
  if (type) opts.type = type;
  if (sentiment) opts.sentiment = sentiment;

  const touchpoints = await CustomerSuccessService.listTouchpoints(organizationId, opts as never);
  return NextResponse.json({ touchpoints });
}

/** POST /api/customer-success/touchpoints — create a touchpoint */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const customerId = String(body.customerId || '').trim();
  const type = String(body.type || '').trim();
  const date = String(body.date || '').trim();
  const participant = String(body.participant || '').trim();
  if (!customerId || !type || !date || !participant) {
    return NextResponse.json({ error: 'customerId_type_date_and_participant_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const touchpoint = await CustomerSuccessService.createTouchpoint(
      ws.organizationId, ws.id,
      {
        customerId, type: type as never, date, participant,
        summary: body.summary, outcome: body.outcome,
        actionItems: body.actionItems, nextSteps: body.nextSteps, sentiment: body.sentiment,
      },
      session.user.id,
    );
    return NextResponse.json({ touchpoint }, { status: 201 });
  } catch (e) {
    console.error('[customer-success/touchpoints] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_touchpoint' }, { status: 500 });
  }
}
