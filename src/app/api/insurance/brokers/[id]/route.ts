import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InsuranceService } from '@/lib/services/insurance-service';

/** GET /api/insurance/brokers/[id] — get a broker */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const broker = await InsuranceService.getBroker(id);
  if (!broker) {
    return NextResponse.json({ error: 'broker_not_found' }, { status: 404 });
  }
  return NextResponse.json({ broker });
}

/** PATCH /api/insurance/brokers/[id] — update a broker */
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
    const broker = await InsuranceService.updateBroker(id, {
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone,
      licenseNumber: body.licenseNumber,
      specialties: body.specialties,
      commissionRate: body.commissionRate !== undefined ? Number(body.commissionRate) : undefined,
    });
    if (!broker) {
      return NextResponse.json({ error: 'broker_not_found' }, { status: 404 });
    }
    return NextResponse.json({ broker });
  } catch (e) {
    console.error('[insurance/brokers] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_broker' }, { status: 500 });
  }
}

/** DELETE /api/insurance/brokers/[id] — delete a broker */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ok = await InsuranceService.deleteBroker(id);
  if (!ok) {
    return NextResponse.json({ error: 'broker_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
