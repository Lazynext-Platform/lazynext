import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { RFQService } from '@/lib/services/rfq-service';

/** GET /api/procurement-v2/rfqs/open — open RFQs */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const rfqs = await RFQService.getOpen(resolved.organizationId);
  return NextResponse.json({ rfqs });
}
