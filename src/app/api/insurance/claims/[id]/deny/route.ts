import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InsuranceService } from '@/lib/services/insurance-service';

/** POST /api/insurance/claims/[id]/deny — deny a claim */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  try {
    const claim = await InsuranceService.denyClaim(
      id,
      body.reason,
      body.deniedBy || session.user.id,
    );
    if (!claim) {
      return NextResponse.json({ error: 'claim_not_found' }, { status: 404 });
    }
    return NextResponse.json({ claim });
  } catch (e) {
    console.error('[insurance/claims/deny] error:', e);
    return NextResponse.json({ error: 'failed_to_deny_claim' }, { status: 500 });
  }
}
