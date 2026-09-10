import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PerformanceManagementService } from '@/lib/services/performance-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ plans: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['employeeId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const plans = await PerformanceManagementService.listPlans(organizationId, opts as never);
  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || '').trim();
  const employeeName = String(body.employeeName || '').trim();
  const type = String(body.type || '').trim();
  const title = String(body.title || '').trim();
  if (!employeeId || !employeeName || !type || !title) return NextResponse.json({ error: 'employeeId_employeeName_type_title_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const plan = await PerformanceManagementService.createPlan(ws.organizationId, ws.id, {
      employeeId, employeeName, type: type as never, title,
      status: body.status, description: body.description,
      progress: body.progress, targetDate: body.targetDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    console.error('[performance-management/plans] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_plan' }, { status: 500 });
  }
}
