import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InsuranceService } from '@/lib/services/insurance-service';

/** GET /api/insurance/coverages/[id] — get a coverage */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const coverage = await InsuranceService.getCoverage(id);
  if (!coverage) {
    return NextResponse.json({ error: 'coverage_not_found' }, { status: 404 });
  }
  return NextResponse.json({ coverage });
}

/** PATCH /api/insurance/coverages/[id] — update a coverage */
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
    const coverage = await InsuranceService.updateCoverage(id, {
      name: body.name,
      description: body.description,
      coveredPerils: body.coveredPerils,
      exclusions: body.exclusions,
      limit: body.limit !== undefined ? Number(body.limit) : undefined,
      sublimits: body.sublimits,
    });
    if (!coverage) {
      return NextResponse.json({ error: 'coverage_not_found' }, { status: 404 });
    }
    return NextResponse.json({ coverage });
  } catch (e) {
    console.error('[insurance/coverages] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_coverage' }, { status: 500 });
  }
}

/** DELETE /api/insurance/coverages/[id] — delete a coverage */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const ok = await InsuranceService.deleteCoverage(id);
  if (!ok) {
    return NextResponse.json({ error: 'coverage_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
