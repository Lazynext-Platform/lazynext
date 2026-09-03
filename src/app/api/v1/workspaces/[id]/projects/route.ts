import { NextRequest, NextResponse } from 'next/server';
import { setRequestForAuth, requireApiKey } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';
import { AuditService, AuditActions } from '@/lib/services/audit';

// GET /api/v1/workspaces/[id]/projects — list projects in a workspace
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['read']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; workspaceId: string | null; scopes: string[]; keyId: string };

  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId } },
  });
  if (!membership) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: { _count: { select: { tasks: true, documents: true } } },
  });

  return NextResponse.json({ projects });
}

// POST /api/v1/workspaces/[id]/projects — create a project
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['write']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; workspaceId: string | null; scopes: string[]; keyId: string };

  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId } },
  });
  if (!membership) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'validation', message: 'name is required' }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      workspaceId,
      name,
      description: body.description || null,
      createdById: apiKeyCtx.userId,
    },
  });

  await AuditService.log({
    userId: apiKeyCtx.userId,
    workspaceId,
    action: AuditActions.PROJECT_CREATE,
    targetType: 'project',
    targetId: project.id,
    metadata: { name },
  });

  return NextResponse.json({ project }, { status: 201 });
}
