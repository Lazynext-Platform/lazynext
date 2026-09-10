import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/disputes — list IP disputes */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ disputes: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { assetId?: string; type?: string; status?: string } = {};
  const assetId = url.searchParams.get('assetId');
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (assetId) opts.assetId = assetId;
  if (type) opts.type = type;
  if (status) opts.status = status;

  const disputes = await IPService.listDisputes(organizationId, opts as never);
  return NextResponse.json({ disputes });
}

/** POST /api/ip/disputes — create an IP dispute */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  if (!title || !type) {
    return NextResponse.json({ error: 'title_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const dispute = await IPService.createDispute(
      ws.organizationId, ws.id,
      {
        assetId: body.assetId, title, type: type as never,
        status: body.status, opposingParty: body.opposingParty,
        filedDate: body.filedDate, jurisdiction: body.jurisdiction,
        description: body.description, claims: body.claims, evidence: body.evidence,
        resolution: body.resolution, legalCosts: body.legalCosts,
      },
      session.user.id,
    );
    return NextResponse.json({ dispute }, { status: 201 });
  } catch (e) {
    console.error('[ip/disputes] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_dispute' }, { status: 500 });
  }
}
