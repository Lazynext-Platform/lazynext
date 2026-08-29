import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/teams/[id] — get team details with members
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  try {
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: id, userId: uid },
      include: {
        team: {
          include: {
            members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
            invitations: { where: { acceptedAt: null } },
          },
        },
      },
    });

    if (!membership) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    return NextResponse.json({
      id: membership.team.id,
      name: membership.team.name,
      slug: membership.team.slug,
      role: membership.role,
      members: membership.team.members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        name: m.user.name || m.user.email || 'Unknown',
        email: m.user.email,
        image: m.user.image,
        joinedAt: m.joinedAt.toISOString(),
      })),
      pendingInvitations: membership.team.invitations.map(i => ({
        id: i.id,
        email: i.email,
        role: i.role,
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(`GET /api/teams/${id} error:`, err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/teams/[id] — delete team (owner only)
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  try {
    const team = await prisma.team.findFirst({ where: { id, ownerId: uid } });
    if (!team) return NextResponse.json({ error: 'not_found_or_not_owner' }, { status: 404 });

    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/teams/${id} error:`, err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
