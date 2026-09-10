import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/trade-secrets — list trade secrets */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ tradeSecrets: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; accessLevel?: string; status?: string } = {};
  const category = url.searchParams.get('category');
  const accessLevel = url.searchParams.get('accessLevel');
  const status = url.searchParams.get('status');
  if (category) opts.category = category;
  if (accessLevel) opts.accessLevel = accessLevel;
  if (status) opts.status = status;

  const tradeSecrets = await IPService.listTradeSecrets(organizationId, opts as never);
  return NextResponse.json({ tradeSecrets });
}

/** POST /api/ip/trade-secrets — create a trade secret */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const accessLevel = String(body.accessLevel || '').trim();
  if (!name || !category || !accessLevel) {
    return NextResponse.json({ error: 'name_category_accessLevel_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const tradeSecret = await IPService.createTradeSecret(
      ws.organizationId, ws.id,
      {
        name, category: category as never, accessLevel: accessLevel as never,
        description: body.description, owner: body.owner, custodian: body.custodian,
        protectionMeasures: body.protectionMeasures, disclosureHistory: body.disclosureHistory,
        value: body.value, createdDate: body.createdDate, lastReviewed: body.lastReviewed,
        status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ tradeSecret }, { status: 201 });
  } catch (e) {
    console.error('[ip/trade-secrets] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_trade_secret' }, { status: 500 });
  }
}
