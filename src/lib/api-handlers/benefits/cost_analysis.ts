import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { BenefitsService } from '@/lib/services/benefits-service';

/** GET /api/benefits/cost-analysis — cost analysis */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const costAnalysis = await BenefitsService.getCostAnalysis(resolved.organizationId);
  return NextResponse.json({ costAnalysis });
}
