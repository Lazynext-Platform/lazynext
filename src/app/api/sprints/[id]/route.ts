import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SprintService } from '@/lib/services/sprint-service';

/** GET /api/sprints/[id] — get a sprint by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const sprint = await SprintService.get(id);
  if (!sprint) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ sprint });
}

/** PATCH /api/sprints/[id] — update a sprint */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const sprint = await SprintService.update(id, {
      name: body.name,
      goal: body.goal,
      status: body.status,
      startDate: body.startDate,
      endDate: body.endDate,
      projectId: body.projectId,
    });
    if (!sprint) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ sprint });
  } catch (e) {
    console.error('[sprints] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_sprint' }, { status: 500 });
  }
}

/** DELETE /api/sprints/[id] — delete a sprint */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await SprintService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
