import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/courses — list courses */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ courses: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; format?: string; difficulty?: string; status?: string } = {};
  const category = url.searchParams.get('category');
  const format = url.searchParams.get('format');
  const difficulty = url.searchParams.get('difficulty');
  const status = url.searchParams.get('status');
  if (category) opts.category = category;
  if (format) opts.format = format;
  if (difficulty) opts.difficulty = difficulty;
  if (status) opts.status = status;

  const courses = await TrainingService.listCourses(organizationId, opts as never);
  return NextResponse.json({ courses });
}

/** POST /api/training/courses — create a course */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const category = String(body.category || '').trim();
  const format = String(body.format || '').trim();
  const difficulty = String(body.difficulty || '').trim();
  if (!title || !category || !format || !difficulty) {
    return NextResponse.json({ error: 'title_category_format_difficulty_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const course = await TrainingService.createCourse(
      ws.organizationId, ws.id,
      {
        title, category: category as never, format: format as never, difficulty: difficulty as never,
        description: body.description, durationHours: body.durationHours, instructor: body.instructor,
        prerequisites: body.prerequisites, tags: body.tags, status: body.status,
        maxParticipants: body.maxParticipants, materials: body.materials, createdDate: body.createdDate,
      },
      session.user.id,
    );
    return NextResponse.json({ course }, { status: 201 });
  } catch (e) {
    console.error('[training/courses] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_course' }, { status: 500 });
  }
}
