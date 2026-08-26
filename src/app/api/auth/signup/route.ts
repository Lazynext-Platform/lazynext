import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { grantCredits } from '@/lib/credits';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
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

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err) {
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
