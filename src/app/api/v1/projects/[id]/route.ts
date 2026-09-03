import { NextRequest, NextResponse } from 'next/server';
import { setRequestForAuth, requireApiKey } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';
import { AuditService, AuditActions } from '@/lib/services/audit';

// GET /api/v1/projects/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['read']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; scopes: string[]; keyId: string };

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null, membership: { userId: apiKeyCtx.userId } },
    include: { _count: { select: { tasks: true, documents: true } } },
  });

  // Fallback: check via workspace membership
  if (!project) {
    const project2 = await prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
    if (project2) {
      const membership = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId: project2.workspaceId } },
      });
      if (membership) {
        return NextResponse.json({ project: { ...project2, _count: { tasks: 0, documents: 0 } } });
      }
    }
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ project });
}

// PATCH /api/v1/projects/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['write']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; scopes: string[]; keyId: string };
  const body = await req.json().catch(() => ({}));

  const project = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId: project.workspaceId } },
  });
  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name: body.name?.trim().slice(0, 200) || undefined,
      description: body.description !== undefined ? (typeof body.description === 'string' ? body.description.slice(0, 2000) : body.description) : undefined,
      status: body.status || undefined,
    },
  });

  await AuditService.log({
    userId: apiKeyCtx.userId,
    workspaceId: project.workspaceId,
    action: AuditActions.PROJECT_UPDATE,
    targetType: 'project',
    targetId: id,
    metadata: body,
  });

  return NextResponse.json({ project: updated });
}

// DELETE /api/v1/projects/[id] (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['write']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; scopes: string[]; keyId: string };

  const project = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId: project.workspaceId } },
  });
  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await prisma.project.update({ where: { id }, data: { deletedAt: new Date(), status: 'deleted' } });

  await AuditService.log({
    userId: apiKeyCtx.userId,
    workspaceId: project.workspaceId,
    action: AuditActions.PROJECT_DELETE,
    targetType: 'project',
    targetId: id,
  });

  return NextResponse.json({ success: true });
}
