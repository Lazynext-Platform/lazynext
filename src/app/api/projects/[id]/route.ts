import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

/**
 * Internal project CRUD API (session-auth).
 * PATCH /api/projects/[id] — update a project.
 * DELETE /api/projects/[id] — soft-delete a project.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const existing = await prisma.project.findFirst({
    where: { id, workspaceId: { in: wsIds }, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: { name?: string; description?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.status && ['active', 'on_hold', 'completed', 'archived'].includes(body.status)) {
    data.status = body.status;
  }

  const project = await prisma.project.update({ where: { id }, data });
  return NextResponse.json({ project });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const existing = await prisma.project.findFirst({
    where: { id, workspaceId: { in: wsIds }, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await prisma.project.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'archived' },
  });

  return NextResponse.json({ ok: true });
}
