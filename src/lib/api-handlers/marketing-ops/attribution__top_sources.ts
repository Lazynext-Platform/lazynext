import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { LeadAttributionService } from '@/lib/services/lead-attribution-service';

/** GET /api/marketing-ops/attribution/top-sources — top performing sources */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const limit = Number(req.nextUrl.searchParams.get('limit')) || 5;
  const sources = await LeadAttributionService.getTopPerformingSources(resolved.organizationId, limit);
  return NextResponse.json({ sources });
}
