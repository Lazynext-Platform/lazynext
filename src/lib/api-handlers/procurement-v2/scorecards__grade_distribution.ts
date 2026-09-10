import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplierScorecardService } from '@/lib/services/supplier-scorecard-service';

/** GET /api/procurement-v2/scorecards/grade-distribution — count by grade */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const distribution = await SupplierScorecardService.getGradeDistribution(resolved.organizationId);
  return NextResponse.json({ distribution });
}
