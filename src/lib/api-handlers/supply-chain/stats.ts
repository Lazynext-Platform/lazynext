import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplyChainService } from '@/lib/services/supply-chain-service';

/** GET /api/supply-chain/stats — get supply chain stats */
export async function GET(_req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;

  try {
    const stats = await SupplyChainService.getStats(organizationId);
    return NextResponse.json({ stats });
  } catch (e) {
    console.error('[supply-chain/stats] error:', e);
    return NextResponse.json({ error: 'failed_to_get_stats' }, { status: 500 });
  }
}
