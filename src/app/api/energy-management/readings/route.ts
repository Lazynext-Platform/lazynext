import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EnergyManagementService } from '@/lib/services/energy-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ readings: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const readings = await EnergyManagementService.listEnergyReadings(organizationId, opts as never);
  return NextResponse.json({ readings });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const meterId = String(body.meterId || '').trim();
  const type = String(body.type || '').trim();
  if (!meterId || !type) return NextResponse.json({ error: 'meterId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const reading = await EnergyManagementService.createEnergyReading(ws.organizationId, ws.id, {
      meterId, type: type as never,
      description: body.description, status: body.status, value: body.value,
      unit: body.unit, readingDate: body.readingDate, previousValue: body.previousValue,
      consumption: body.consumption, cost: body.cost, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ reading }, { status: 201 });
  } catch (e) {
    console.error('[energy-management/readings] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_reading' }, { status: 500 });
  }
}
