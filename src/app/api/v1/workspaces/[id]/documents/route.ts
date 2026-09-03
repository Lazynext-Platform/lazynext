import { NextRequest, NextResponse } from 'next/server';
import { setRequestForAuth, requireApiKey } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';
import { AuditService, AuditActions } from '@/lib/services/audit';

// GET /api/v1/workspaces/[id]/documents
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['read']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; scopes: string[]; keyId: string };

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId } },
  });
  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const documents = await prisma.document.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ documents });
}

// POST /api/v1/workspaces/[id]/documents
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['write']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; scopes: string[]; keyId: string };

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: apiKeyCtx.userId, workspaceId } },
  });
  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: 'validation', message: 'title is required' }, { status: 400 });

  const doc = await prisma.document.create({
    data: {
      workspaceId,
      title,
      content: body.content || '',
      projectId: body.projectId || null,
      createdById: apiKeyCtx.userId,
    },
  });

  await AuditService.log({
    userId: apiKeyCtx.userId,
    workspaceId,
    action: AuditActions.DOCUMENT_CREATE,
    targetType: 'document',
    targetId: doc.id,
    metadata: { title },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
