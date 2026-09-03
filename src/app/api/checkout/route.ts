import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/../auth';
import { paymentProvider } from '@/lib/payments';
import { getPack } from '@/config/pricing';
import { LOCALES, type Locale } from '@/i18n/messages';
import { isUrlSafe } from '@/lib/security';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { packId } = await req.json().catch(() => ({}));
  const pack = getPack(packId);
  if (!pack) return NextResponse.json({ error: 'unknown_pack' }, { status: 400 });

  const provider = paymentProvider();
  if (provider.mode !== 'checkout' || !provider.createCheckout)
    return NextResponse.json({ error: 'checkout_not_enabled' }, { status: 400 });

  const rawOrigin = req.headers.get('origin') || process.env.NEXTAUTH_URL || '';
  // Validate origin is a safe HTTP(S) URL before passing to payment provider.
  const origin = rawOrigin && isUrlSafe(rawOrigin) ? rawOrigin.slice(0, 2048) : '';

  // ── Global: gather locale/country/currency from cookies (set by the geo-detection layer) ──
  const localeCookie = (await cookies()).get('locale')?.value;
  const locale = (LOCALES as readonly string[]).includes(localeCookie || '') ? (localeCookie as Locale) : 'en';
  const country = (await cookies()).get('country')?.value || undefined;
  const currency = (await cookies()).get('currency')?.value || undefined;

  try {
    const { url } = await provider.createCheckout({
      userId: session.user.id,
      email: session.user.email,
      pack,
      origin,
      locale,
      country,
      currency,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error('[checkout] error:', String(e));
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 });
  }
}
