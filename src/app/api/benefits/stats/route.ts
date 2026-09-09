import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { BenefitsService } from '@/lib/services/benefits-service';

/** GET /api/benefits/stats — benefits stats */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const stats = await BenefitsService.getStats(resolved.organizationId);
  return NextResponse.json({ stats });
}
