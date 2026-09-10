import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplierScorecardService } from '@/lib/services/supplier-scorecard-service';

/** GET /api/procurement-v2/scorecards/top — top-rated suppliers */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const limit = Number(req.nextUrl.searchParams.get('limit')) || 10;
  const suppliers = await SupplierScorecardService.getTopSuppliers(resolved.organizationId, limit);
  return NextResponse.json({ suppliers });
}
