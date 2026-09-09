import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/agreements/[id] — get a single agreement */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const agreement = await FranchiseService.getAgreement(id);
  if (!agreement) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ agreement });
}

/** PATCH /api/franchise/agreements/[id] — update an agreement */
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
    const agreement = await FranchiseService.updateAgreement(id, {
      type: body.type,
      startDate: body.startDate, endDate: body.endDate, territory: body.territory,
      initialFee: body.initialFee, royaltyRate: body.royaltyRate,
      advertisingFundRate: body.advertisingFundRate,
      renewalTerms: body.renewalTerms, terminationConditions: body.terminationConditions,
      status: body.status, signedDate: body.signedDate, notes: body.notes,
    });
    if (!agreement) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ agreement });
  } catch (e) {
    console.error('[franchise/agreements] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_agreement' }, { status: 500 });
  }
}
