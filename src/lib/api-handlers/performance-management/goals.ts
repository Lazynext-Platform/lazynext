import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PerformanceManagementService } from '@/lib/services/performance-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ goals: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['employeeId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const goals = await PerformanceManagementService.listGoals(organizationId, opts as never);
  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || '').trim();
  const employeeName = String(body.employeeName || '').trim();
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  if (!employeeId || !employeeName || !title || !type) return NextResponse.json({ error: 'employeeId_employeeName_title_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const goal = await PerformanceManagementService.createGoal(ws.organizationId, ws.id, {
      employeeId, employeeName, title, type: type as never,
      status: body.status, priority: body.priority,
      description: body.description, progress: body.progress,
      targetDate: body.targetDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ goal }, { status: 201 });
  } catch (e) {
    console.error('[performance-management/goals] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_goal' }, { status: 500 });
  }
}
