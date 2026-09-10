import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PartnerService } from '@/lib/services/partner-service';

/** GET /api/partners/partners — list partners */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ partners: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; tier?: string; status?: string; region?: string } = {};
  const type = url.searchParams.get('type');
  const tier = url.searchParams.get('tier');
  const status = url.searchParams.get('status');
  const region = url.searchParams.get('region');
  if (type) opts.type = type;
  if (tier) opts.tier = tier;
  if (status) opts.status = status;
  if (region) opts.region = region;

  const partners = await PartnerService.listPartners(organizationId, opts as never);
  return NextResponse.json({ partners });
}

/** POST /api/partners/partners — create a partner */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) {
    return NextResponse.json({ error: 'name_and_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const partner = await PartnerService.createPartner(
      ws.organizationId, ws.id,
      {
        name, type: type as never,
        tier: body.tier, status: body.status,
        contactName: body.contactName, contactEmail: body.contactEmail, contactPhone: body.contactPhone,
        region: body.region, industry: body.industry, website: body.website,
        dealRegistrationEnabled: body.dealRegistrationEnabled, marginRate: body.marginRate,
        joinedDate: body.joinedDate, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ partner }, { status: 201 });
  } catch (e) {
    console.error('[partners/partners] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_partner' }, { status: 500 });
  }
}
