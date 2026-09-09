import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PartnerService } from '@/lib/services/partner-service';

/** GET /api/partners/deals/[id] — get a single deal */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deal = await PartnerService.getDeal(id);
  if (!deal) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deal });
}

/** PATCH /api/partners/deals/[id] — update a deal */
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
    const deal = await PartnerService.updateDeal(id, {
      partnerId: body.partnerId, customerName: body.customerName, dealValue: body.dealValue,
      stage: body.stage, expectedCloseDate: body.expectedCloseDate, description: body.description,
      dealType: body.dealType, margin: body.margin, registeredDate: body.registeredDate,
      status: body.status,
    });
    if (!deal) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ deal });
  } catch (e) {
    console.error('[partners/deals] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_deal' }, { status: 500 });
  }
}
