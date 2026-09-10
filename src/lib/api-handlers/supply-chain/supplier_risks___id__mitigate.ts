import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplyChainService } from '@/lib/services/supply-chain-service';

/** POST /api/supply-chain/supplier-risks/[id]/mitigate — mitigate a supplier risk */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const mitigation = String(body.mitigation || '').trim();
  if (!mitigation) {
    return NextResponse.json({ error: 'mitigation_required' }, { status: 400 });
  }

  try {
    const risk = await SupplyChainService.mitigateSupplierRisk(id, mitigation, userId);
    if (!risk) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ risk });
  } catch (e) {
    console.error('[supply-chain/supplier-risks/mitigate] error:', e);
    return NextResponse.json({ error: 'failed_to_mitigate_supplier_risk' }, { status: 500 });
  }
}
