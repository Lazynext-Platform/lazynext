import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { HazardManagementService } from '@/lib/services/hazard-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const riskAssessment = await HazardManagementService.getRiskAssessment(id);
  if (!riskAssessment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ riskAssessment });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const riskAssessment = await HazardManagementService.updateRiskAssessment(id, body);
    if (!riskAssessment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ riskAssessment });
  } catch (e) {
    console.error('[hazard-management/risk-assessments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_risk_assessment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await HazardManagementService.deleteRiskAssessment(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
