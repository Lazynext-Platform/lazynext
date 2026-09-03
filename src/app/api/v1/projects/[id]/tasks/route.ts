import { NextRequest, NextResponse } from 'next/server';
import { setRequestForAuth, requireApiKey } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';
import { AuditService, AuditActions } from '@/lib/services/audit';

// GET /api/v1/projects/[id]/tasks
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['read']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; scopes: string[]; keyId: string };

  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId: project.workspaceId } },
  });
  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const tasks = await prisma.task.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ tasks });
}

// POST /api/v1/projects/[id]/tasks
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['write']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; scopes: string[]; keyId: string };

  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId: project.workspaceId } },
  });
  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: 'validation', message: 'title is required' }, { status: 400 });

  const VALID_TASK_STATUSES = ['todo', 'in_progress', 'done', 'cancelled'];
  const VALID_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
  const task = await prisma.task.create({
    data: {
      projectId,
      title: title.slice(0, 200),
      description: typeof body.description === 'string' ? body.description.slice(0, 2000) : null,
      status: typeof body.status === 'string' && VALID_TASK_STATUSES.includes(body.status) ? body.status : 'todo',
      priority: typeof body.priority === 'string' && VALID_TASK_PRIORITIES.includes(body.priority) ? body.priority : 'medium',
      assigneeId: typeof body.assigneeId === 'string' ? body.assigneeId.slice(0, 128) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });

  await AuditService.log({
    userId: apiKeyCtx.userId,
    workspaceId: project.workspaceId,
    action: AuditActions.TASK_CREATE,
    targetType: 'task',
    targetId: task.id,
    metadata: { title },
  });

  return NextResponse.json({ task }, { status: 201 });
}
