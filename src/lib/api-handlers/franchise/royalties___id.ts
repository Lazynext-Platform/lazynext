import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/royalties/[id] — get a single royalty */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const royalty = await FranchiseService.getRoyalty(id);
  if (!royalty) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ royalty });
}

/** PATCH /api/franchise/royalties/[id] — update a royalty */
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
    const royalty = await FranchiseService.updateRoyalty(id, {
      period: body.period, grossSales: body.grossSales,
      royaltyRate: body.royaltyRate, royaltyAmount: body.royaltyAmount,
      advertisingFundAmount: body.advertisingFundAmount, additionalFees: body.additionalFees,
      totalAmount: body.totalAmount,
      dueDate: body.dueDate, paidDate: body.paidDate, status: body.status, notes: body.notes,
    });
    if (!royalty) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ royalty });
  } catch (e) {
    console.error('[franchise/royalties] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_royalty' }, { status: 500 });
  }
}
