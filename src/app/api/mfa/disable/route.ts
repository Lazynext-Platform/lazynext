import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { verifyTOTP } from '@/lib/mfa';
import { safeError } from '@/lib/security';
import { revokeAllUserSessions } from '@/lib/session-revocation';

/**
 * POST /api/mfa/disable — Disable MFA for the authenticated user.
 * Body: { code: "123456" } — requires a valid TOTP code to disable.
 *
 * Clears mfaSecret and sets mfaEnabled=false.
 * Revokes all sessions after MFA disable (security best practice —
 * ensures no potentially compromised sessions persist without MFA).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'code_required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mfaSecret: true, mfaEnabled: true },
    });

    if (!user?.mfaEnabled || !user?.mfaSecret) {
      return NextResponse.json({ error: 'mfa_not_enabled' }, { status: 400 });
    }

    const valid = await verifyTOTP(user.mfaSecret, code);
    if (!valid) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { mfaSecret: null, mfaEnabled: false },
    });

    // Revoke all sessions — user must re-authenticate without MFA.
    await revokeAllUserSessions(session.user.id).catch(() => {});

    return NextResponse.json({ disabled: true });
  } catch (e) {
    return NextResponse.json(safeError(e, 'mfa_disable', 'disable_failed'), { status: 500 });
  }
}
