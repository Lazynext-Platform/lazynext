import { NextRequest, NextResponse } from 'next/server';
import { setRequestForAuth, requireApiKey } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';
import { AuditService, AuditActions } from '@/lib/services/audit';

// GET /api/v1/tasks/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['read']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; scopes: string[]; keyId: string };

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: { project: { select: { workspaceId: true } } },
  });
  if (!task) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId: task.project.workspaceId } },
  });
  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  return NextResponse.json({ task });
}

// PATCH /api/v1/tasks/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['write']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; scopes: string[]; keyId: string };
  const body = await req.json().catch(() => ({}));

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: { project: { select: { workspaceId: true } } },
  });
  if (!task) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId: task.project.workspaceId } },
  });
  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const VALID_TASK_STATUSES = ['todo', 'in_progress', 'done', 'cancelled'];
  const VALID_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
  const updated = await prisma.task.update({
    where: { id },
    data: {
      title: body.title?.trim().slice(0, 200) || undefined,
      description: body.description !== undefined ? (typeof body.description === 'string' ? body.description.slice(0, 2000) : body.description) : undefined,
      status: typeof body.status === 'string' && VALID_TASK_STATUSES.includes(body.status) ? body.status : undefined,
      priority: typeof body.priority === 'string' && VALID_TASK_PRIORITIES.includes(body.priority) ? body.priority : undefined,
      assigneeId: typeof body.assigneeId === 'string' ? body.assigneeId.slice(0, 128) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    },
  });

  await AuditService.log({
    userId: apiKeyCtx.userId,
    workspaceId: task.project.workspaceId,
    action: AuditActions.TASK_UPDATE,
    targetType: 'task',
    targetId: id,
    metadata: body,
  });

  return NextResponse.json({ task: updated });
}

// DELETE /api/v1/tasks/[id] (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['write']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; scopes: string[]; keyId: string };

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: { project: { select: { workspaceId: true } } },
  });
  if (!task) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId: task.project.workspaceId } },
  });
  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });

  await AuditService.log({
    userId: apiKeyCtx.userId,
    workspaceId: task.project.workspaceId,
    action: AuditActions.TASK_DELETE,
    targetType: 'task',
    targetId: id,
  });

  return NextResponse.json({ success: true });
}
