import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/expansions — list expansions */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ expansions: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { customerId?: string; type?: string; status?: string } = {};
  const customerId = url.searchParams.get('customerId');
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (customerId) opts.customerId = customerId;
  if (type) opts.type = type;
  if (status) opts.status = status;

  const expansions = await CustomerSuccessService.listExpansions(organizationId, opts as never);
  return NextResponse.json({ expansions });
}

/** POST /api/customer-success/expansions — create an expansion */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const customerId = String(body.customerId || '').trim();
  const type = String(body.type || '').trim();
  const opportunity = String(body.opportunity || '').trim();
  if (!customerId || !type || !opportunity) {
    return NextResponse.json({ error: 'customerId_type_and_opportunity_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const expansion = await CustomerSuccessService.createExpansion(
      ws.organizationId, ws.id,
      {
        customerId, type: type as never, opportunity,
        estimatedValue: typeof body.estimatedValue === 'number' ? body.estimatedValue : 0,
        probability: body.probability, expectedCloseDate: body.expectedCloseDate,
        status: body.status, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ expansion }, { status: 201 });
  } catch (e) {
    console.error('[customer-success/expansions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_expansion' }, { status: 500 });
  }
}
