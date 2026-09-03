import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/automations/[id] — update an automation (name, trigger, enabled, definition).
 * DELETE /api/automations/[id] — delete an automation.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const existing = await prisma.automation.findFirst({
    where: { id, workspaceId: { in: wsIds } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: { name?: string; trigger?: string; enabled?: boolean; definition?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name?.trim()) data.name = body.name.trim().slice(0, 200);
  if (body.trigger?.trim()) data.trigger = body.trigger.trim().slice(0, 100);
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled;
  if (body.definition !== undefined) data.definition = String(body.definition).slice(0, 10_000);

  const automation = await prisma.automation.update({ where: { id }, data });
  return NextResponse.json({ automation });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const existing = await prisma.automation.findFirst({
    where: { id, workspaceId: { in: wsIds } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await prisma.automation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
