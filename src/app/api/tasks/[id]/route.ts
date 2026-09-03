import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

/**
 * Internal task CRUD API (session-auth).
 * PATCH /api/tasks/[id] — update a task (status, priority, title, etc).
 * DELETE /api/tasks/[id] — soft-delete a task.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const existing = await prisma.task.findFirst({
    where: { id, project: { workspaceId: { in: wsIds } }, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.title?.trim()) data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.status && ['todo', 'in_progress', 'done'].includes(body.status)) data.status = body.status;
  if (body.priority && ['low', 'medium', 'high', 'urgent'].includes(body.priority)) data.priority = body.priority;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const task = await prisma.task.update({ where: { id }, data });
  return NextResponse.json({ task });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const existing = await prisma.task.findFirst({
    where: { id, project: { workspaceId: { in: wsIds } }, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await prisma.task.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
