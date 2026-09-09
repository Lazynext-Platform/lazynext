import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/assets — list IP assets */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ assets: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string; jurisdiction?: string; owner?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const jurisdiction = url.searchParams.get('jurisdiction');
  const owner = url.searchParams.get('owner');
  if (type) opts.type = type;
  if (status) opts.status = status;
  if (jurisdiction) opts.jurisdiction = jurisdiction;
  if (owner) opts.owner = owner;

  const assets = await IPService.listAssets(organizationId, opts as never);
  return NextResponse.json({ assets });
}

/** POST /api/ip/assets — create an IP asset */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const status = String(body.status || '').trim();
  if (!title || !type || !status) {
    return NextResponse.json({ error: 'title_type_status_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const asset = await IPService.createAsset(
      ws.organizationId, ws.id,
      {
        title, type: type as never, status: status as never,
        registrationNumber: body.registrationNumber, filingDate: body.filingDate,
        grantDate: body.grantDate, expiryDate: body.expiryDate,
        jurisdiction: body.jurisdiction, inventor: body.inventor, owner: body.owner,
        description: body.description, value: body.value, classification: body.classification,
        tags: body.tags, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ asset }, { status: 201 });
  } catch (e) {
    console.error('[ip/assets] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_asset' }, { status: 500 });
  }
}
