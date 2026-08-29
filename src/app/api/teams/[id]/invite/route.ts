import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

/**
 * POST /api/teams/[id]/invite
 * Body: { email: string, role: 'editor' | 'viewer' }
 * Creates an invitation and returns the invite token/URL.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  try {
    // Verify membership and role (only owner/editor can invite)
    const membership = await prisma.teamMember.findFirst({ where: { teamId: id, userId: uid } });
    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      return NextResponse.json({ error: 'not_authorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || 'viewer');

    // Basic email format validation (regex instead of just includes('@'))
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) return NextResponse.json({ error: 'valid_email_required' }, { status: 400 });
    if (!['editor', 'viewer'].includes(role)) return NextResponse.json({ error: 'invalid_role' }, { status: 400 });

    // Check if already a member
    const existingMember = await prisma.user.findFirst({ where: { email } });
    if (existingMember) {
      const existingMembership = await prisma.teamMember.findFirst({ where: { teamId: id, userId: existingMember.id } });
      if (existingMembership) return NextResponse.json({ error: 'already_member' }, { status: 400 });
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.teamInvitation.findFirst({ where: { teamId: id, email, acceptedAt: null } });
    if (existingInvite) return NextResponse.json({ error: 'invitation_already_sent' }, { status: 400 });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId: id,
        email,
        role,
        token,
        invitedBy: uid,
        expiresAt,
      },
    });

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      inviteUrl: `/teams/join?token=${token}`,
      expiresAt: invitation.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error(`POST /api/teams/${id}/invite error:`, err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
