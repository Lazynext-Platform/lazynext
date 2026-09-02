import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/teams/[id]/members/[memberId]
 * Body: { role: string }
 * Update a member's role (owner only)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const { id, memberId } = await params;

  const requesterMembership = await prisma.teamMember.findFirst({ where: { teamId: id, userId: uid } });
  if (!requesterMembership || requesterMembership.role !== 'owner') {
    return NextResponse.json({ error: 'owner_only' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const role = String(body.role || '');
  if (!['owner', 'editor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }

  const targetMember = await prisma.teamMember.findFirst({ where: { id: memberId, teamId: id } });
  if (!targetMember) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Don't allow changing the owner's role if they're the team owner
  const team = await prisma.team.findFirst({ where: { id } });
  if (team?.ownerId === targetMember.userId && role !== 'owner') {
    return NextResponse.json({ error: 'cannot_demote_owner' }, { status: 400 });
  }

  await prisma.teamMember.update({ where: { id: memberId }, data: { role } });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/teams/[id]/members/[memberId]
 * Remove a member from the team (owner or self-removal)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const { id, memberId } = await params;

  const targetMember = await prisma.teamMember.findFirst({ where: { id: memberId, teamId: id } });
  if (!targetMember) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const requesterMembership = await prisma.teamMember.findFirst({ where: { teamId: id, userId: uid } });
  if (!requesterMembership) return NextResponse.json({ error: 'not_authorized' }, { status: 403 });

  // Can remove if: self-removal, or requester is owner
  const isSelfRemoval = targetMember.userId === uid;
  const isOwner = requesterMembership.role === 'owner';
  if (!isSelfRemoval && !isOwner) return NextResponse.json({ error: 'not_authorized' }, { status: 403 });

  // Don't allow removing the team owner
  const team = await prisma.team.findFirst({ where: { id } });
  if (team?.ownerId === targetMember.userId) {
    return NextResponse.json({ error: 'cannot_remove_owner' }, { status: 400 });
  }

  await prisma.teamMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
