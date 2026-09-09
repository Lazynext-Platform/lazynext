import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PartnerService } from '@/lib/services/partner-service';

/** GET /api/partners/comarketing/[id] — get a single co-marketing campaign */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const comarketing = await PartnerService.getCoMarketing(id);
  if (!comarketing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ comarketing });
}

/** PATCH /api/partners/comarketing/[id] — update a co-marketing campaign */
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
    const comarketing = await PartnerService.updateCoMarketing(id, {
      partnerId: body.partnerId, campaignName: body.campaignName, type: body.type,
      description: body.description, budget: body.budget, costShare: body.costShare,
      startDate: body.startDate, endDate: body.endDate, status: body.status,
      expectedLeads: body.expectedLeads, actualLeads: body.actualLeads,
    });
    if (!comarketing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ comarketing });
  } catch (e) {
    console.error('[partners/comarketing] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_comarketing' }, { status: 500 });
  }
}
