import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/learning-paths/[id] — get a single learning path */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const learningPath = await TrainingService.getLearningPath(id);
  if (!learningPath) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ learningPath });
}

/** PATCH /api/training/learning-paths/[id] — update a learning path */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const learningPath = await TrainingService.updateLearningPath(id, {
      name: body.name, description: body.description, category: body.category,
      courses: body.courses, targetRole: body.targetRole, estimatedHours: body.estimatedHours,
      status: body.status, difficulty: body.difficulty,
    });
    if (!learningPath) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ learningPath });
  } catch (e) {
    console.error('[training/learning-paths] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_learning_path' }, { status: 500 });
  }
}

/** DELETE /api/training/learning-paths/[id] — delete a learning path */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await TrainingService.deleteLearningPath(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[training/learning-paths] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_learning_path' }, { status: 500 });
  }
}
