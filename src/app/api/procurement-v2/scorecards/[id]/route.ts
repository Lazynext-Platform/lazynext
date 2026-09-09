import { NextRequest, NextResponse } from 'next/server';
import { SupplierScorecardService } from '@/lib/services/supplier-scorecard-service';

/** GET /api/procurement-v2/scorecards/[id] — get a scorecard by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scorecard = await SupplierScorecardService.get(id);
  if (!scorecard) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ scorecard });
}

/** PATCH /api/procurement-v2/scorecards/[id] — update a scorecard */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const scorecard = await SupplierScorecardService.update(id, {
      vendorName: body.vendorName,
      period: body.period,
      qualityScore: body.qualityScore !== undefined ? Number(body.qualityScore) : undefined,
      deliveryScore: body.deliveryScore !== undefined ? Number(body.deliveryScore) : undefined,
      costScore: body.costScore !== undefined ? Number(body.costScore) : undefined,
      serviceScore: body.serviceScore !== undefined ? Number(body.serviceScore) : undefined,
      complianceScore: body.complianceScore !== undefined ? Number(body.complianceScore) : undefined,
      notes: body.notes,
    });
    if (!scorecard) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ scorecard });
  } catch (e) {
    console.error('[procurement-v2/scorecards] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_scorecard' }, { status: 500 });
  }
}

/** DELETE /api/procurement-v2/scorecards/[id] — delete a scorecard */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await SupplierScorecardService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
