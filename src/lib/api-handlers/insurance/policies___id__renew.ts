import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InsuranceService } from '@/lib/services/insurance-service';

/** POST /api/insurance/policies/[id]/renew — renew a policy */
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
  if (!body.newEndDate) {
    return NextResponse.json({ error: 'newEndDate_required' }, { status: 400 });
  }

  try {
    const policy = await InsuranceService.renewPolicy(
      id,
      body.newEndDate,
      body.newPremium !== undefined ? Number(body.newPremium) : undefined,
      body.renewedBy || session.user.id,
    );
    if (!policy) {
      return NextResponse.json({ error: 'policy_not_found' }, { status: 404 });
    }
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[insurance/policies/renew] error:', e);
    return NextResponse.json({ error: 'failed_to_renew_policy' }, { status: 500 });
  }
}
