import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { LeadAttributionService } from '@/lib/services/lead-attribution-service';

/** GET /api/marketing-ops/attribution/conversion — conversion rate by source */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const conversion = await LeadAttributionService.getConversionBySource(resolved.organizationId);
  return NextResponse.json({ conversion });
}
