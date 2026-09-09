import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PlanManagementService } from '@/lib/services/plan-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ enrollments: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['planId', 'employeeId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const enrollments = await PlanManagementService.listEnrollments(organizationId, opts as never);
  return NextResponse.json({ enrollments });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const planId = String(body.planId || '').trim();
  const employeeId = String(body.employeeId || '').trim();
  const employeeName = String(body.employeeName || '').trim();
  const type = String(body.type || '').trim();
  if (!planId || !employeeId || !employeeName || !type) return NextResponse.json({ error: 'planId_employeeId_employeeName_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const enrollment = await PlanManagementService.createEnrollment(ws.organizationId, ws.id, {
      planId, employeeId, employeeName, type: type as never,
      description: body.description, status: body.status,
      enrollmentDate: body.enrollmentDate, effectiveDate: body.effectiveDate,
      terminationDate: body.terminationDate, dependents: body.dependents,
      contribution: body.contribution, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (e) {
    console.error('[plan-management/enrollments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_enrollment' }, { status: 500 });
  }
}
