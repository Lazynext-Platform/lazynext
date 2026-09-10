import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SafetyTrainingService } from '@/lib/services/safety-training-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ enrollments: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const enrollments = await SafetyTrainingService.listTrainingEnrollments(organizationId, opts as never);
  return NextResponse.json({ enrollments });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) return NextResponse.json({ error: 'name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const enrollment = await SafetyTrainingService.createTrainingEnrollment(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, courseId: body.courseId,
      employeeId: body.employeeId, employeeName: body.employeeName,
      enrollmentDate: body.enrollmentDate, completionDate: body.completionDate,
      score: body.score, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (e) {
    console.error('[safety-training/enrollments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_enrollment' }, { status: 500 });
  }
}
