import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/enrollments — list enrollments */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ enrollments: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { courseId?: string; employeeName?: string; status?: string } = {};
  const courseId = url.searchParams.get('courseId');
  const employeeName = url.searchParams.get('employeeName');
  const status = url.searchParams.get('status');
  if (courseId) opts.courseId = courseId;
  if (employeeName) opts.employeeName = employeeName;
  if (status) opts.status = status;

  const enrollments = await TrainingService.listEnrollments(organizationId, opts as never);
  return NextResponse.json({ enrollments });
}

/** POST /api/training/enrollments — create an enrollment */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const courseId = String(body.courseId || '').trim();
  const employeeName = String(body.employeeName || '').trim();
  const status = String(body.status || '').trim();
  if (!courseId || !employeeName || !status) {
    return NextResponse.json({ error: 'courseId_employeeName_status_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const enrollment = await TrainingService.createEnrollment(
      ws.organizationId, ws.id,
      {
        courseId, employeeName, status: status as never,
        employeeEmail: body.employeeEmail, enrolledDate: body.enrolledDate,
        completedDate: body.completedDate, progress: body.progress,
        score: body.score, certificateId: body.certificateId, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (e) {
    console.error('[training/enrollments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_enrollment' }, { status: 500 });
  }
}
