import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GHGEmissionsManagementService } from '@/lib/services/ghg-emissions-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ emissions: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'scope', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const emissions = await GHGEmissionsManagementService.listGHGEmissions(organizationId, opts as never);
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
  const name = String(body.name || '').trim();
  try {
    const emission = await GHGEmissionsManagementService.createGHGEmission(ws.organizationId, ws.id, {
      name, type: type as never, scope,
      description: body.description, status: body.status, period: body.reportingPeriod,
      amount: body.amount, unit: body.unit, co2e: body.co2e, source: body.source,
      notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ emission }, { status: 201 });
  } catch (e) {
    console.error('[ghg-emissions-management/emissions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_emission' }, { status: 500 });
  }
}
