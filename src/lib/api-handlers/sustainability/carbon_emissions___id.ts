import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/carbon-emissions/[id] — get a carbon emission */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const emission = await SustainabilityService.getCarbonEmission(id);
  if (!emission) {
    return NextResponse.json({ error: 'carbon_emission_not_found' }, { status: 404 });
  }
  return NextResponse.json({ emission });
}

/** PATCH /api/sustainability/carbon-emissions/[id] — update a carbon emission */
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
    const emission = await SustainabilityService.updateCarbonEmission(id, {
      scope: body.scope,
      source: body.source,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      unit: body.unit,
      period: body.period,
      facility: body.facility,
      offset: body.offset !== undefined ? Number(body.offset) : undefined,
      netEmission: body.netEmission !== undefined ? Number(body.netEmission) : undefined,
    });
    if (!emission) {
      return NextResponse.json({ error: 'carbon_emission_not_found' }, { status: 404 });
    }
    return NextResponse.json({ emission });
  } catch (e) {
    console.error('[sustainability/carbon-emissions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_carbon_emission' }, { status: 500 });
  }
}

/** DELETE /api/sustainability/carbon-emissions/[id] — delete a carbon emission */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const ok = await SustainabilityService.deleteCarbonEmission(id);
  if (!ok) {
    return NextResponse.json({ error: 'carbon_emission_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
