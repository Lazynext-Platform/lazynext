import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/agents/[id] — update an agent.
 * DELETE /api/agents/[id] — delete an agent.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const existing = await prisma.agentDef.findFirst({
    where: { id, workspaceId: { in: wsIds } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: {
    name?: string;
    modelProvider?: string;
    modelName?: string;
    instructions?: string;
    toolIds?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name?.trim()) data.name = body.name.trim().slice(0, 200);
  if (body.modelProvider?.trim()) data.modelProvider = body.modelProvider.trim().slice(0, 50);
  if (body.modelName?.trim()) data.modelName = body.modelName.trim().slice(0, 100);
  if (body.instructions !== undefined) data.instructions = String(body.instructions).slice(0, 10_000);
  if (body.toolIds !== undefined) data.toolIds = String(body.toolIds).slice(0, 1000);

  const agent = await prisma.agentDef.update({ where: { id }, data });
  return NextResponse.json({ agent });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const existing = await prisma.agentDef.findFirst({
    where: { id, workspaceId: { in: wsIds } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await prisma.agentDef.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
