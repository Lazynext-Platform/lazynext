import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/trademarks — list trademarks */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ trademarks: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; jurisdiction?: string } = {};
  const status = url.searchParams.get('status');
  const jurisdiction = url.searchParams.get('jurisdiction');
  if (status) opts.status = status;
  if (jurisdiction) opts.jurisdiction = jurisdiction;

  const trademarks = await IPService.listTrademarks(organizationId, opts as never);
  return NextResponse.json({ trademarks });
}

/** POST /api/ip/trademarks — create a trademark */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const status = String(body.status || '').trim();
  const classes = body.classes;
  if (!name || !status || !Array.isArray(classes)) {
    return NextResponse.json({ error: 'name_status_classes_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const trademark = await IPService.createTrademark(
      ws.organizationId, ws.id,
      {
        name, classes, status: status as never,
        registrationNumber: body.registrationNumber, filingDate: body.filingDate,
        registrationDate: body.registrationDate, expiryDate: body.expiryDate,
        jurisdiction: body.jurisdiction, logoDescription: body.logoDescription,
        colorsClaimed: body.colorsClaimed, priorityClaim: body.priorityClaim,
        owner: body.owner, attorney: body.attorney,
      },
      session.user.id,
    );
    return NextResponse.json({ trademark }, { status: 201 });
  } catch (e) {
    console.error('[ip/trademarks] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_trademark' }, { status: 500 });
  }
}
