import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RelocationService } from '@/lib/services/relocation-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ cases: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const cases = await RelocationService.listCases(organizationId, opts as never);
  return NextResponse.json({ cases });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || '').trim();
  const employeeName = String(body.employeeName || '').trim();
  const type = String(body.type || '').trim();
  if (!employeeId || !employeeName || !type) return NextResponse.json({ error: 'employeeId_employeeName_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const caseRecord = await RelocationService.createCase(ws.organizationId, ws.id, {
      employeeId, employeeName, type: type as never,
      description: body.description, status: body.status,
      originLocation: body.originLocation, destinationLocation: body.destinationLocation,
      startDate: body.startDate, endDate: body.endDate,
      familySize: body.familySize, budget: body.budget,
      assignedCoordinator: body.assignedCoordinator, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ case: caseRecord }, { status: 201 });
  } catch (e) {
    console.error('[relocation/cases] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_case' }, { status: 500 });
  }
}
