import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getCredits } from '@/lib/credits';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const credits = await getCredits(session.user.id);
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = !!(session.user.email && adminEmails.includes(session.user.email.toLowerCase()));
  return NextResponse.json({ credits, isAdmin });
}
