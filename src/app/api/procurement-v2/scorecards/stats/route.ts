import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplierScorecardService } from '@/lib/services/supplier-scorecard-service';

/** GET /api/procurement-v2/scorecards/stats — scorecard stats */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const stats = await SupplierScorecardService.getStats(resolved.organizationId);
  return NextResponse.json({ stats });
}
