import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { grantCredits } from '@/lib/credits';
import { isDisposableEmail } from '@/lib/disposable-emails';
import { sendVerificationEmail } from '@/lib/email';
import { checkAuthRateLimit, getClientIP } from '@/lib/auth-rate-limit';

export async function POST(req: Request) {
  try {
    // Rate limit: 5 signups per IP per 10 minutes
    const ip = getClientIP(req);
    const { limited, retryAfter } = checkAuthRateLimit(ip, 'signup', 5, 10 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter || 600) } },
      );
    }

    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (password.length > 128) {
      return NextResponse.json({ error: 'Password must be at most 128 characters' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Block disposable/temporary email domains
    if (isDisposableEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Please use a real email address — temporary email domains are not allowed' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        password: hashed,
      },
    });

    // Grant signup bonus credits
    const bonus = parseInt(process.env.SIGNUP_BONUS_CREDITS || '0', 10);
    if (bonus > 0 && user.id) await grantCredits(user.id, bonus, 'signup');

    // Generate and store email verification token (24h expiry)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token, expires },
    });

    // Send verification email (non-blocking — don't fail signup if email fails)
    await sendVerificationEmail(normalizedEmail, token);

    return NextResponse.json({ ok: true, userId: user.id, message: 'Verification email sent' });
  } catch (err) {
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
