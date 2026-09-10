import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/assessments/[id] — get a single assessment */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const assessment = await TrainingService.getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ assessment });
}

/** PATCH /api/training/assessments/[id] — update an assessment */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const assessment = await TrainingService.updateAssessment(id, {
      courseId: body.courseId, title: body.title, description: body.description,
      type: body.type, questions: body.questions, passingScore: body.passingScore,
      durationMinutes: body.durationMinutes, attemptsAllowed: body.attemptsAllowed,
      status: body.status,
    });
    if (!assessment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ assessment });
  } catch (e) {
    console.error('[training/assessments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_assessment' }, { status: 500 });
  }
}

/** DELETE /api/training/assessments/[id] — delete an assessment */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await TrainingService.deleteAssessment(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[training/assessments] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_assessment' }, { status: 500 });
  }
}
