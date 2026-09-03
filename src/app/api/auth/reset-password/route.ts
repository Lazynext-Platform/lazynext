import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { revokeAllUserSessions } from '@/lib/session-revocation';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }
    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      return NextResponse.json({ error: 'Reset token has expired. Please request a new one.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: record.identifier },
      select: { id: true },
    });

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email: record.identifier },
      data: { password: hashed },
    });

    // Revoke all sessions — the user may have reset their password because
    // their account was compromised. Invalidate all existing sessions.
    if (user) {
      await revokeAllUserSessions(user.id).catch(() => {});
    }

    // Delete the used token
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});

    return NextResponse.json({ ok: true, message: 'Password reset successfully' });
  } catch (err) {
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
