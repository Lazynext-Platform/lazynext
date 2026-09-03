import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/settings/account — permanently delete the user's account
 * and all associated data (GDPR right to erasure).
 *
 * Requires password confirmation for email+password accounts.
 * OAuth-only accounts can delete without password.
 *
 * This cascades to all related records via Prisma onDelete: Cascade.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, password: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Verify password if the user has one set
  if (user.password) {
    if (!body.password) {
      return NextResponse.json({ error: 'password_required' }, { status: 400 });
    }
    const valid = await bcrypt.compare(body.password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'password_incorrect' }, { status: 403 });
    }
  }

  // Delete the user — cascades to all related records
  await prisma.user.delete({
    where: { id: session.user.id },
  });

  return NextResponse.json({ ok: true, message: 'Account deleted permanently' });
}
