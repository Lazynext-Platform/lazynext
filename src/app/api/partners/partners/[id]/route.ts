import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PartnerService } from '@/lib/services/partner-service';

/** GET /api/partners/partners/[id] — get a single partner */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const partner = await PartnerService.getPartner(id);
  if (!partner) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ partner });
}

/** PATCH /api/partners/partners/[id] — update a partner */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const partner = await PartnerService.updatePartner(id, {
      name: body.name, type: body.type, tier: body.tier, status: body.status,
      contactName: body.contactName, contactEmail: body.contactEmail, contactPhone: body.contactPhone,
      region: body.region, industry: body.industry, website: body.website,
      dealRegistrationEnabled: body.dealRegistrationEnabled, marginRate: body.marginRate,
      joinedDate: body.joinedDate, notes: body.notes,
    });
    if (!partner) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ partner });
  } catch (e) {
    console.error('[partners/partners] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_partner' }, { status: 500 });
  }
}

/** DELETE /api/partners/partners/[id] — delete a partner */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await PartnerService.deletePartner(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[partners/partners] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_partner' }, { status: 500 });
  }
}
