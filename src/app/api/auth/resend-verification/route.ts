import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';
import { checkAuthRateLimit, getClientIP } from '@/lib/auth-rate-limit';

export async function POST(req: Request) {
  try {
    // Rate limit: 3 resend requests per IP per 10 minutes
    const ip = getClientIP(req as any);
    const { limited, retryAfter } = checkAuthRateLimit(ip, 'resend', 3, 10 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter || 600) } },
      );
    }

    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Don't reveal whether the email exists — return success either way
    if (!user || user.emailVerified) {
      return NextResponse.json({ ok: true });
    }

    // Delete any existing tokens for this email
    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } }).catch(() => {});

    // Generate a new token (24h expiry)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token, expires },
    });

    // Send the email (non-blocking — don't fail if email fails)
    await sendVerificationEmail(normalizedEmail, token);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to resend verification email' }, { status: 500 });
  }
}
