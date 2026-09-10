import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MAService } from '@/lib/services/ma-service';

/** GET /api/ma/valuations — list valuations */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ valuations: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { targetId?: string; method?: string } = {};
  const targetId = url.searchParams.get('targetId');
  const method = url.searchParams.get('method');
  if (targetId) opts.targetId = targetId;
  if (method) opts.method = method;

  const valuations = await MAService.listValuations(organizationId, opts as never);
  return NextResponse.json({ valuations });
}

/** POST /api/ma/valuations — create a valuation */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const targetId = String(body.targetId || '').trim();
  const method = String(body.method || '').trim();
  const value = Number(body.value);
  if (!targetId || !method || isNaN(value)) {
    return NextResponse.json({ error: 'targetId_method_and_value_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const valuation = await MAService.createValuation(
      ws.organizationId, ws.id,
      {
        targetId, method: method as never, value,
        rangeLow: body.rangeLow, rangeHigh: body.rangeHigh,
        assumptions: body.assumptions, multiples: body.multiples,
        date: body.date, analyst: body.analyst,
      },
      session.user.id,
    );
    return NextResponse.json({ valuation }, { status: 201 });
  } catch (e) {
    console.error('[ma/valuations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_valuation' }, { status: 500 });
  }
}
