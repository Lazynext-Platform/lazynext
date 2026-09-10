import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/teams — list teams the user is a member of
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  try {
    const memberships = await prisma.teamMember.findMany({
      where: { userId: uid },
      take: 100,
      include: { team: { include: { members: true, invitations: true } } },
    });

    return NextResponse.json({
      teams: memberships.map(m => ({
        id: m.team.id,
        name: m.team.name,
        slug: m.team.slug,
        role: m.role,
        memberCount: m.team.members.length,
        pendingInvitations: m.team.invitations.filter(i => !i.acceptedAt).length,
        createdAt: m.team.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('GET /api/teams error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/**
 * POST /api/teams — create a new team
 * Body: { name: string }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name || name.length > 100) return NextResponse.json({ error: 'name_required' }, { status: 400 });

  try {
    // Generate unique slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.team.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const team = await prisma.team.create({
      data: {
        name,
        slug,
        ownerId: uid,
        members: { create: [{ userId: uid, role: 'owner' }] },
      },
      include: { members: true },
    });

    return NextResponse.json({
      id: team.id,
      name: team.name,
      slug: team.slug,
      role: 'owner',
      memberCount: team.members.length,
      createdAt: team.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('POST /api/teams error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
