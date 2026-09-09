import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EnvironmentalComplianceService } from '@/lib/services/environmental-compliance-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ emissions: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'scope', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const emissions = await EnvironmentalComplianceService.listEmissions(organizationId, opts as never);
  return NextResponse.json({ emissions });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  const scope = String(body.scope || '').trim();
  if (!type || !scope) return NextResponse.json({ error: 'type_scope_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const emission = await EnvironmentalComplianceService.createEmission(ws.organizationId, ws.id, {
      type: type as never, scope: scope as never,
      description: body.description, status: body.status, facility: body.facility,
      source: body.source, amount: body.amount, unit: body.unit,
      measurementDate: body.measurementDate, reportingPeriod: body.reportingPeriod,
      verifiedBy: body.verifiedBy, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ emission }, { status: 201 });
  } catch (e) {
    console.error('[environmental-compliance/emissions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_emission' }, { status: 500 });
  }
}
