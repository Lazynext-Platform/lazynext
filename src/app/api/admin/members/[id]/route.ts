import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

const VALID_ROLES = ['owner', 'admin', 'member', 'viewer', 'guest'];

/**
 * PATCH /api/admin/members/[id] — change a member's role.
 * DELETE /api/admin/members/[id] — remove a member from the workspace.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const newRole = body.role?.trim();
  if (!newRole || !VALID_ROLES.includes(newRole)) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }

  // Find the membership
  const membership = await prisma.membership.findUnique({ where: { id } });
  if (!membership) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Verify the current user is owner/admin of this workspace
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const ws = workspaces.find((w) => w.id === membership.workspaceId);
  if (!ws) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (ws.role !== 'owner' && ws.role !== 'admin') {
    return NextResponse.json({ error: 'insufficient_permissions' }, { status: 403 });
  }

  // Can't change an owner's role unless you're the owner
  if (membership.role === 'owner' && ws.role !== 'owner') {
    return NextResponse.json({ error: 'cannot_change_owner' }, { status: 403 });
  }

  // Can't demote yourself
  if (membership.userId === session.user.id && newRole !== 'owner') {
    return NextResponse.json({ error: 'cannot_demote_self' }, { status: 403 });
  }

  const updated = await prisma.membership.update({
    where: { id },
    data: { role: newRole },
  });

  return NextResponse.json({ membership: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const membership = await prisma.membership.findUnique({ where: { id } });
  if (!membership) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const ws = workspaces.find((w) => w.id === membership.workspaceId);
  if (!ws) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Can remove yourself or be owner/admin
  if (membership.userId !== session.user.id && ws.role !== 'owner' && ws.role !== 'admin') {
    return NextResponse.json({ error: 'insufficient_permissions' }, { status: 403 });
  }

  // Can't remove the owner
  if (membership.role === 'owner') {
    return NextResponse.json({ error: 'cannot_remove_owner' }, { status: 403 });
  }

  await prisma.membership.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
