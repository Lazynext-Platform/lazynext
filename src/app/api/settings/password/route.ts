import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { revokeAllUserSessions } from '@/lib/session-revocation';

/**
 * POST /api/settings/password — change the current user's password.
 * Requires the current password to be verified.
 * Only works for email+password accounts (not OAuth-only).
 * Revokes all other sessions after password change (security best practice).
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'current_password_and_new_password_required' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
  }
  if (newPassword.length > 128) {
    return NextResponse.json({ error: 'password_too_long' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user?.password) {
    return NextResponse.json({ error: 'no_password_set_use_oauth' }, { status: 400 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: 'current_password_incorrect' }, { status: 403 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  // Revoke all sessions (including this one) — the client should redirect to login.
  // This ensures any stolen JWTs are invalidated after a password change.
  await revokeAllUserSessions(session.user.id).catch(() => {});

  return NextResponse.json({ ok: true });
}
