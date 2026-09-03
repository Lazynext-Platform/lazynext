import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

/**
 * Internal document CRUD API (session-auth).
 * PATCH /api/documents/[id] — update document title/content (increments version).
 * DELETE /api/documents/[id] — soft-delete a document.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const existing = await prisma.document.findFirst({
    where: { id, workspaceId: { in: wsIds }, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: { title?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  let versionChanged = false;

  if (body.title?.trim() && body.title !== existing.title) {
    data.title = body.title.trim();
    versionChanged = true;
  }
  if (body.content !== undefined && body.content !== existing.content) {
    data.content = body.content;
    versionChanged = true;
  }
  if (versionChanged) {
    data.version = { increment: 1 };
  }

  const doc = await prisma.document.update({ where: { id }, data });
  return NextResponse.json({ document: doc });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const existing = await prisma.document.findFirst({
    where: { id, workspaceId: { in: wsIds }, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
