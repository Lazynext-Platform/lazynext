import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token || token.length > 200) {
      return NextResponse.redirect(new URL('/?error=invalid-token', req.url));
    }

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record) {
      return NextResponse.redirect(new URL('/?error=invalid-token', req.url));
    }
    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      return NextResponse.redirect(new URL('/?error=token-expired', req.url));
    }

    // Mark user as verified
    await prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    });

    // Delete the used token
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});

    return NextResponse.redirect(new URL('/?verified=true', req.url));
  } catch (err) {
    return NextResponse.redirect(new URL('/?error=verification-failed', req.url));
  }
}
