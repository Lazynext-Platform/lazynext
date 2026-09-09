import { NextRequest, NextResponse } from 'next/server';
import { BenefitsService } from '@/lib/services/benefits-service';
import type { ClaimStatus } from '@/lib/services/benefits-service';

/** GET /api/benefits/claims/[id] — get a claim by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const claim = await BenefitsService.getClaim(id);
  if (!claim) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ claim });
}

/** PATCH /api/benefits/claims/[id] — update claim status */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || '').trim() as ClaimStatus;
  if (!status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  try {
    const claim = await BenefitsService.updateClaimStatus(id, status, body.notes);
    if (!claim) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ claim });
  } catch (e) {
    console.error('[benefits/claims] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_claim' }, { status: 500 });
  }
}
