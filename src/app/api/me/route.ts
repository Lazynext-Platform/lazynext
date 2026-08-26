import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getCredits } from '@/lib/credits';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const isAdmin = !!(session.user.email && adminEmails.includes(session.user.email.toLowerCase()));
    try {
      const credits = await getCredits(session.user.id);
      return NextResponse.json({ credits, isAdmin });
    } catch {
      // Transient D1 cold-start in workerd — return session info with 0 credits
      // so the client can retry gracefully instead of showing a console 500.
      return NextResponse.json({ credits: 0, isAdmin, transient: true });
    }
  } catch {
    // auth() itself can throw JWEInvalid on stale/mismatched session cookies
    // (e.g. after AUTH_SECRET rotation). Treat as unauthenticated.
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
}
