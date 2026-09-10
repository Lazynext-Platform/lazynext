import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/licenses — list IP licenses */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ licenses: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { assetId?: string; type?: string; status?: string; licensee?: string } = {};
  const assetId = url.searchParams.get('assetId');
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const licensee = url.searchParams.get('licensee');
  if (assetId) opts.assetId = assetId;
  if (type) opts.type = type;
  if (status) opts.status = status;
  if (licensee) opts.licensee = licensee;

  const licenses = await IPService.listLicenses(organizationId, opts as never);
  return NextResponse.json({ licenses });
}

/** POST /api/ip/licenses — create an IP license */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const assetId = String(body.assetId || '').trim();
  const licensee = String(body.licensee || '').trim();
  const type = String(body.type || '').trim();
  const startDate = String(body.startDate || '').trim();
  if (!assetId || !licensee || !type || !startDate) {
    return NextResponse.json({ error: 'assetId_licensee_type_startDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const license = await IPService.createLicense(
      ws.organizationId, ws.id,
      {
        assetId, licensee, type: type as never, startDate,
        territory: body.territory, fieldOfUse: body.fieldOfUse,
        endDate: body.endDate, royaltyRate: body.royaltyRate,
        minimumRoyalty: body.minimumRoyalty, upfrontFee: body.upfrontFee,
        status: body.status, terms: body.terms, restrictions: body.restrictions,
        signedDate: body.signedDate,
      },
      session.user.id,
    );
    return NextResponse.json({ license }, { status: 201 });
  } catch (e) {
    console.error('[ip/licenses] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_license' }, { status: 500 });
  }
}
