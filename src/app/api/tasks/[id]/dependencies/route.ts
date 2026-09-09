import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TaskService } from '@/lib/services/task';

/**
 * POST /api/tasks/[id]/dependencies — add a dependency.
 * Body: { dependsOnId: string }
 *
 * DELETE /api/tasks/[id]/dependencies — remove a dependency.
 * Body: { dependsOnId: string }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { dependsOnId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const dependsOnId = body.dependsOnId?.trim();
  if (!dependsOnId) {
    return NextResponse.json({ error: 'dependsOnId_required' }, { status: 400 });
  }

  try {
    const result = await TaskService.addDependency(taskId, dependsOnId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[tasks/dependencies] add error:', e);
    return NextResponse.json({ ok: false, error: 'failed_to_add_dependency' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { dependsOnId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const dependsOnId = body.dependsOnId?.trim();
  if (!dependsOnId) {
    return NextResponse.json({ error: 'dependsOnId_required' }, { status: 400 });
  }

  try {
    await TaskService.removeDependency(taskId, dependsOnId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[tasks/dependencies] remove error:', e);
    return NextResponse.json({ ok: false, error: 'failed_to_remove_dependency' }, { status: 500 });
  }
}
