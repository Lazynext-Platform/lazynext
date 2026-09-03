import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { verifyTOTP } from '@/lib/mfa';
import { safeError } from '@/lib/security';
import { checkAuthRateLimit, getClientIP } from '@/lib/auth-rate-limit';

/**
 * POST /api/mfa/verify — Verify a TOTP code and enable MFA.
 * Body: { code: "123456" }
 *
 * If the code is valid, sets mfaEnabled=true on the user record.
 * Subsequent logins will require a TOTP code.
 * Rate-limited to prevent TOTP brute-force attacks.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Rate limit: 10 MFA attempts per minute per IP
  const ip = getClientIP(req as any);
  const { limited, retryAfter } = checkAuthRateLimit(ip, 'mfa-verify', 10, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter || 60) } },
    );
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

    if (!user?.mfaSecret) {
      return NextResponse.json({ error: 'mfa_not_setup' }, { status: 400 });
    }

    if (user.mfaEnabled) {
      return NextResponse.json({ error: 'mfa_already_enabled' }, { status: 400 });
    }

    const valid = await verifyTOTP(user.mfaSecret, code);
    if (!valid) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { mfaEnabled: true },
    });

    return NextResponse.json({ enabled: true });
  } catch (e) {
    return NextResponse.json(safeError(e, 'mfa_verify', 'verify_failed'), { status: 500 });
  }
}
