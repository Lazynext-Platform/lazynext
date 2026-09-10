import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplyChainService } from '@/lib/services/supply-chain-service';

/** GET /api/supply-chain/metrics — get supply chain metrics */
export async function GET(_req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;

  try {
    const metrics = await SupplyChainService.getSupplyChainMetrics(organizationId);
    return NextResponse.json({ metrics });
  } catch (e) {
    console.error('[supply-chain/metrics] error:', e);
    return NextResponse.json({ error: 'failed_to_get_metrics' }, { status: 500 });
  }
}
