import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/courses/[id] — get a single course */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const course = await TrainingService.getCourse(id);
  if (!course) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ course });
}

/** PATCH /api/training/courses/[id] — update a course */
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
    const course = await TrainingService.updateCourse(id, {
      title: body.title, description: body.description, category: body.category,
      format: body.format, durationHours: body.durationHours, difficulty: body.difficulty,
      instructor: body.instructor, prerequisites: body.prerequisites, tags: body.tags,
      status: body.status, maxParticipants: body.maxParticipants, materials: body.materials,
    });
    if (!course) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ course });
  } catch (e) {
    console.error('[training/courses] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_course' }, { status: 500 });
  }
}

/** DELETE /api/training/courses/[id] — delete a course */
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
    const ok = await TrainingService.deleteCourse(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[training/courses] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_course' }, { status: 500 });
  }
}
