import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PartnerService } from '@/lib/services/partner-service';

/** POST /api/partners/partners/[id]/upgrade — upgrade a partner's tier */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const tier = String(body.tier || '').trim();
  if (!tier) {
    return NextResponse.json({ error: 'tier_required' }, { status: 400 });
  }

  try {
    const partner = await PartnerService.upgradeTier(id, tier as never, session.user.id);
    if (!partner) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ partner });
  } catch (e) {
    console.error('[partners/partners/upgrade] error:', e);
    return NextResponse.json({ error: 'failed_to_upgrade_partner' }, { status: 500 });
  }
}
