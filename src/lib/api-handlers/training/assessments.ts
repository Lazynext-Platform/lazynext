import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/assessments — list assessments */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ assessments: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { courseId?: string; type?: string; status?: string } = {};
  const courseId = url.searchParams.get('courseId');
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (courseId) opts.courseId = courseId;
  if (type) opts.type = type;
  if (status) opts.status = status;

  const assessments = await TrainingService.listAssessments(organizationId, opts as never);
  return NextResponse.json({ assessments });
}

/** POST /api/training/assessments — create an assessment */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const questions = body.questions;
  if (!title || !type || !Array.isArray(questions)) {
    return NextResponse.json({ error: 'title_type_questions_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const assessment = await TrainingService.createAssessment(
      ws.organizationId, ws.id,
      {
        title, type: type as never, questions,
        courseId: body.courseId, description: body.description,
        passingScore: body.passingScore, durationMinutes: body.durationMinutes,
        attemptsAllowed: body.attemptsAllowed, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (e) {
    console.error('[training/assessments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_assessment' }, { status: 500 });
  }
}
