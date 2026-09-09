import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InsuranceService } from '@/lib/services/insurance-service';

/** GET /api/insurance/claims/[id] — get a claim */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const claim = await InsuranceService.getClaim(id);
  if (!claim) {
    return NextResponse.json({ error: 'claim_not_found' }, { status: 404 });
  }
  return NextResponse.json({ claim });
}

/** PATCH /api/insurance/claims/[id] — update a claim */
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
    const claim = await InsuranceService.updateClaim(id, {
      claimNumber: body.claimNumber,
      incidentDate: body.incidentDate,
      description: body.description,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      status: body.status,
      adjuster: body.adjuster,
      filedBy: body.filedBy,
      notes: body.notes,
    });
    if (!claim) {
      return NextResponse.json({ error: 'claim_not_found' }, { status: 404 });
    }
    return NextResponse.json({ claim });
  } catch (e) {
    console.error('[insurance/claims] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_claim' }, { status: 500 });
  }
}
