import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PartnerService } from '@/lib/services/partner-service';

/** GET /api/partners/tiers/[id] — get a single tier */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const tier = await PartnerService.getTier(id);
  if (!tier) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ tier });
}

/** PATCH /api/partners/tiers/[id] — update a tier */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const tier = await PartnerService.updateTier(id, {
      name: body.name, level: body.level,
      requirements: body.requirements, benefits: body.benefits,
      description: body.description,
    });
    if (!tier) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ tier });
  } catch (e) {
    console.error('[partners/tiers] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_tier' }, { status: 500 });
  }
}

/** DELETE /api/partners/tiers/[id] — delete a tier */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await PartnerService.deleteTier(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[partners/tiers] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_tier' }, { status: 500 });
  }
}
