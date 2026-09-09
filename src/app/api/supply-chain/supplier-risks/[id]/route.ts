import { NextRequest, NextResponse } from 'next/server';
import { SupplyChainService } from '@/lib/services/supply-chain-service';
import type { RiskSeverity, SupplierRiskStatus, SupplierRiskType } from '@/lib/services/supply-chain-service';

/** GET /api/supply-chain/supplier-risks/[id] — get a supplier risk by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const risk = await SupplyChainService.getSupplierRisk(id);
  if (!risk) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ risk });
}

/** PATCH /api/supply-chain/supplier-risks/[id] — update a supplier risk */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const risk = await SupplyChainService.updateSupplierRisk(id, {
      riskType: body.riskType as SupplierRiskType | undefined,
      severity: body.severity as RiskSeverity | undefined,
      description: body.description,
      mitigation: body.mitigation,
      status: body.status as SupplierRiskStatus | undefined,
    });
    if (!risk) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ risk });
  } catch (e) {
    console.error('[supply-chain/supplier-risks] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_supplier_risk' }, { status: 500 });
  }
}
