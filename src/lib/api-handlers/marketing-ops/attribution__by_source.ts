import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { LeadAttributionService } from '@/lib/services/lead-attribution-service';

/** GET /api/marketing-ops/attribution/by-source — attributions grouped by source */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const bySource = await LeadAttributionService.getBySource(resolved.organizationId);
  return NextResponse.json({ bySource });
}
