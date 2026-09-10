import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplyChainService } from '@/lib/services/supply-chain-service';
import type { RiskSeverity, SupplierRiskStatus, SupplierRiskType } from '@/lib/services/supply-chain-service';

/** GET /api/supply-chain/supplier-risks — list supplier risks */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const risks = await SupplyChainService.listSupplierRisks(organizationId, {
    supplierId: sp.get('supplierId') || undefined,
    severity: (sp.get('severity') as RiskSeverity) || undefined,
    status: (sp.get('status') as SupplierRiskStatus) || undefined,
  });

  return NextResponse.json({ risks });
}

/** POST /api/supply-chain/supplier-risks — create a supplier risk */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const supplierId = String(body.supplierId || '').trim();
  const riskType = String(body.riskType || '').trim() as SupplierRiskType;
  const severity = String(body.severity || '').trim() as RiskSeverity;
  if (!supplierId) {
    return NextResponse.json({ error: 'supplierId_required' }, { status: 400 });
  }
  if (!riskType) {
    return NextResponse.json({ error: 'riskType_required' }, { status: 400 });
  }
  if (!severity) {
    return NextResponse.json({ error: 'severity_required' }, { status: 400 });
  }

  try {
    const risk = await SupplyChainService.createSupplierRisk(
      organizationId,
      body.workspaceId || organizationId,
      {
        supplierId,
        riskType,
        severity,
        description: body.description,
        mitigation: body.mitigation,
        status: body.status as SupplierRiskStatus | undefined,
      },
      userId,
    );
    return NextResponse.json({ risk }, { status: 201 });
  } catch (e) {
    console.error('[supply-chain/supplier-risks] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_supplier_risk' }, { status: 500 });
  }
}
