import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LOCALES, type Locale } from '@/i18n/messages';
import { CURRENCY_CODES, currencyForCountry } from '@/config/pricing';

/**
 * GET /api/me/preferences
 * Returns the user's saved locale/country/currency, falling back to cookies,
 * then to defaults (en/US/USD).
 *
 * POST /api/me/preferences
 * Persists locale/country/currency to the User model and sets cookies.
 * Body: { locale?, country?, currency? }
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const c = cookies();

  let locale = c.get('locale')?.value || 'en';
  let country = c.get('country')?.value || 'US';
  let currency = c.get('currency')?.value || 'USD';

  // If logged in, prefer persisted DB values
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { locale: true, country: true, currency: true },
    });
    if (user?.locale) locale = user.locale;
    if (user?.country) country = user.country;
    if (user?.currency) currency = user.currency;
  }

  // Validate
  if (!(LOCALES as readonly string[]).includes(locale)) locale = 'en';
  if (!/^[A-Z]{2}$/.test(country)) country = 'US';
  if (!CURRENCY_CODES.includes(currency)) currency = 'USD';

  return NextResponse.json({ locale, country, currency });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { locale, country, currency } = body as {
    locale?: string;
    country?: string;
    currency?: string;
  };

  // Validate inputs
  const updates: { locale?: string; country?: string; currency?: string } = {};
  if (locale && (LOCALES as readonly string[]).includes(locale)) {
    updates.locale = locale as Locale;
  }
  if (country && /^[A-Z]{2}$/.test(country)) {
    updates.country = country;
    // Auto-derive currency from country if currency not explicitly provided
    if (!currency) updates.currency = currencyForCountry(country);
  }
  if (currency && CURRENCY_CODES.includes(currency)) {
    updates.currency = currency;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_valid_fields' }, { status: 400 });
  }

  // Persist to DB
  await prisma.user.update({
    where: { id: session.user.id },
    data: updates,
  });

  // Set cookies too (so server components can read them without a DB hit)
  const res = NextResponse.json({ ok: true, ...updates });
  if (updates.locale) res.cookies.set('locale', updates.locale, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  if (updates.country) res.cookies.set('country', updates.country, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  if (updates.currency) res.cookies.set('currency', updates.currency, { path: '/', maxAge: 31536000, sameSite: 'lax' });

  return res;
}
