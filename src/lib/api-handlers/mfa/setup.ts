import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { generateTOTPSecret, generateOTPAuthURI } from '@/lib/mfa';
import { safeError } from '@/lib/security';

/**
 * POST /api/mfa/setup — Generate a new TOTP secret for the authenticated user.
 * The secret is stored on the user record but MFA is not enabled until
 * the user verifies a code via POST /api/mfa/verify.
 *
 * Returns: { secret, otpauthUri } — the client shows a QR code from otpauthUri.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const secret = generateTOTPSecret();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, mfaEnabled: true },
    });

    if (user?.mfaEnabled) {
      return NextResponse.json(
        { error: 'mfa_already_enabled' },
        { status: 400 },
      );
    }

    // Store the secret (not yet enabled — user must verify a code first)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { mfaSecret: secret },
    });

    const otpauthUri = generateOTPAuthURI(secret, user?.email || 'user');

    return NextResponse.json({ secret, otpauthUri });
  } catch (e) {
    return NextResponse.json(safeError(e, 'mfa_setup', 'setup_failed'), { status: 500 });
  }
}
