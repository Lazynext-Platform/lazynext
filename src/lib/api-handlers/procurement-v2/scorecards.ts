import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplierScorecardService } from '@/lib/services/supplier-scorecard-service';
import type { SupplierGrade } from '@/lib/services/supplier-scorecard-service';

/** GET /api/procurement-v2/scorecards — list supplier scorecards */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const scorecards = await SupplierScorecardService.list(organizationId, {
    vendorId: sp.get('vendorId') || undefined,
    period: sp.get('period') || undefined,
    grade: (sp.get('grade') as SupplierGrade) || undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ scorecards });
}

/** POST /api/procurement-v2/scorecards — create a supplier scorecard */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const vendorId = String(body.vendorId || '').trim();
  const vendorName = String(body.vendorName || '').trim();
  if (!vendorId || !vendorName) {
    return NextResponse.json({ error: 'vendor_required' }, { status: 400 });
  }

  try {
    const scorecard = await SupplierScorecardService.create(organizationId, {
      vendorId,
      vendorName,
      period: String(body.period || ''),
      qualityScore: Number(body.qualityScore) || 0,
      deliveryScore: Number(body.deliveryScore) || 0,
      costScore: Number(body.costScore) || 0,
      serviceScore: Number(body.serviceScore) || 0,
      complianceScore: Number(body.complianceScore) || 0,
      notes: body.notes,
      workspaceId: body.workspaceId,
      createdBy: userId,
    });
    return NextResponse.json({ scorecard }, { status: 201 });
  } catch (e) {
    console.error('[procurement-v2/scorecards] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_scorecard' }, { status: 500 });
  }
}
