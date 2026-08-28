import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/teams/join
 * Body: { token: string }
 * Accept a team invitation.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const token = String(body.token || '');
  if (!token) return NextResponse.json({ error: 'token_required' }, { status: 400 });

  const invitation = await prisma.teamInvitation.findFirst({ where: { token } });
  if (!invitation) return NextResponse.json({ error: 'invalid_token' }, { status: 404 });
  if (invitation.acceptedAt) return NextResponse.json({ error: 'already_accepted' }, { status: 400 });
  if (invitation.expiresAt < new Date()) return NextResponse.json({ error: 'expired' }, { status: 410 });

  // Check if user's email matches the invitation
  const user = await prisma.user.findFirst({ where: { id: uid } });
  if (!user?.email || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json({ error: 'email_mismatch' }, { status: 403 });
  }

  // Check if already a member
  const existingMembership = await prisma.teamMember.findFirst({
    where: { teamId: invitation.teamId, userId: uid },
  });
  if (existingMembership) {
    // Mark as accepted anyway
    await prisma.teamInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    return NextResponse.json({ ok: true, alreadyMember: true, teamId: invitation.teamId });
  }

  // Create membership and mark invitation as accepted
  await prisma.$transaction([
    prisma.teamMember.create({
      data: { teamId: invitation.teamId, userId: uid, role: invitation.role },
    }),
    prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, teamId: invitation.teamId, role: invitation.role });
}
