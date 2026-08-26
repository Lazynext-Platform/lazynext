import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkAuthRateLimit, getClientIP } from '@/lib/auth-rate-limit';

export async function POST(req: Request) {
  try {
    // Rate limit: 3 password reset requests per IP per 10 minutes
    const ip = getClientIP(req);
    const { limited, retryAfter } = checkAuthRateLimit(ip, 'forgot-password', 3, 10 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many reset requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter || 600) } },
      );
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always return success — don't leak whether the email exists
    if (!user || !user.password) {
      return NextResponse.json({ ok: true, message: 'If an account exists, a reset link has been sent' });
    }

    // Delete any existing reset tokens for this email
    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } }).catch(() => {});

    // Generate reset token (1 hour expiry)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token, expires },
    });

    await sendPasswordResetEmail(normalizedEmail, token);

    return NextResponse.json({ ok: true, message: 'If an account exists, a reset link has been sent' });
  } catch (err) {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}
