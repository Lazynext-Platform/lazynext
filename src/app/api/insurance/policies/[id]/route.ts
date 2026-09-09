import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InsuranceService } from '@/lib/services/insurance-service';

/** GET /api/insurance/policies/[id] — get a policy */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const policy = await InsuranceService.getPolicy(id);
  if (!policy) {
    return NextResponse.json({ error: 'policy_not_found' }, { status: 404 });
  }
  return NextResponse.json({ policy });
}

/** PATCH /api/insurance/policies/[id] — update a policy */
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
    const policy = await InsuranceService.updatePolicy(id, {
      policyNumber: body.policyNumber,
      type: body.type,
      provider: body.provider,
      broker: body.broker,
      premium: body.premium !== undefined ? Number(body.premium) : undefined,
      deductible: body.deductible !== undefined ? Number(body.deductible) : undefined,
      coverageLimit: body.coverageLimit !== undefined ? Number(body.coverageLimit) : undefined,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
      beneficiaries: body.beneficiaries,
    });
    if (!policy) {
      return NextResponse.json({ error: 'policy_not_found' }, { status: 404 });
    }
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[insurance/policies] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_policy' }, { status: 500 });
  }
}

/** DELETE /api/insurance/policies/[id] — delete a policy */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ok = await InsuranceService.deletePolicy(id);
  if (!ok) {
    return NextResponse.json({ error: 'policy_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
