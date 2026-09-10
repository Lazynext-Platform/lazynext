import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/learning-paths — list learning paths */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ learningPaths: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; status?: string; targetRole?: string } = {};
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const targetRole = url.searchParams.get('targetRole');
  if (category) opts.category = category;
  if (status) opts.status = status;
  if (targetRole) opts.targetRole = targetRole;

  const learningPaths = await TrainingService.listLearningPaths(organizationId, opts as never);
  return NextResponse.json({ learningPaths });
}

/** POST /api/training/learning-paths — create a learning path */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const courses = body.courses;
  if (!name || !Array.isArray(courses)) {
    return NextResponse.json({ error: 'name_courses_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const learningPath = await TrainingService.createLearningPath(
      ws.organizationId, ws.id,
      {
        name, courses,
        description: body.description, category: body.category,
        targetRole: body.targetRole, estimatedHours: body.estimatedHours,
        status: body.status, difficulty: body.difficulty,
      },
      session.user.id,
    );
    return NextResponse.json({ learningPath }, { status: 201 });
  } catch (e) {
    console.error('[training/learning-paths] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_learning_path' }, { status: 500 });
  }
}
