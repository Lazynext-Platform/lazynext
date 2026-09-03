import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { paymentProvider } from '@/lib/payments';
import { checkAuthRateLimit, getClientIP } from '@/lib/auth-rate-limit';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Rate limit: 5 redeem attempts per minute per IP (coupon brute-force protection)
  const ip = getClientIP(req as any);
  const { limited, retryAfter } = checkAuthRateLimit(ip, 'redeem', 5, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter || 60) } },
    );
  }

  const { code } = await req.json().catch(() => ({}));
  if (!code) return NextResponse.json({ error: 'empty_code' }, { status: 400 });

  const provider = paymentProvider();
  if (provider.mode !== 'redeem' || !provider.redeem)
    return NextResponse.json({ error: 'redeem_not_enabled' }, { status: 400 });

  try {
    const { amount } = await provider.redeem(session.user.id, code);
    return NextResponse.json({ amount });
  } catch (e) {
    console.error('[redeem] error:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'redeem_failed' }, { status: 400 });
  }
}
