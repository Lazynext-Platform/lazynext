import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WaterManagementService } from '@/lib/services/water-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ tests: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['meterId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const tests = await WaterManagementService.listWaterQualityTests(organizationId, opts as never);
  return NextResponse.json({ tests });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const description = String(body.description || '').trim();
  const type = String(body.type || '').trim();
  if (!description || !type) return NextResponse.json({ error: 'description_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const test = await WaterManagementService.createWaterQualityTest(ws.organizationId, ws.id, {
      meterId: body.meterId, type: type as never,
      description, status: body.status,
      scheduledDate: body.scheduledDate, completedDate: body.completedDate,
      result: body.result, parameter: body.parameter,
      value: body.value, unit: body.unit, passFail: body.passFail,
      notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ test }, { status: 201 });
  } catch (e) {
    console.error('[water-management/quality-tests] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_test' }, { status: 500 });
  }
}
