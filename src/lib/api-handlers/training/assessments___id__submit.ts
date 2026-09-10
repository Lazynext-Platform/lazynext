import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TrainingService } from '@/lib/services/training-service';

/** POST /api/training/assessments/[id]/submit — submit an assessment */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const employeeName = String(body.employeeName || '').trim();
  if (!employeeName) {
    return NextResponse.json({ error: 'employeeName_required' }, { status: 400 });
  }
  const answers = body.answers ?? {};
  const score = Number(body.score ?? 0);

  try {
    const assessment = await TrainingService.submitAssessment(id, employeeName, answers, score, session.user.id);
    if (!assessment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ assessment });
  } catch (e) {
    console.error('[training/assessments/submit] error:', e);
    return NextResponse.json({ error: 'failed_to_submit_assessment' }, { status: 500 });
  }
}
