import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { currencyForCountry } from '@/config/pricing';

/**
 * Middleware: on first visit (no country cookie), detects the user's country
 * from their IP and sets country + currency cookies. Also ensures the locale
 * cookie is set if missing.
 *
 * This runs on every request, but only does IP geolocation once (when the
 * country cookie is absent). Subsequent requests just pass through.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const countryCookie = req.cookies.get('country')?.value;
  const localeCookie = req.cookies.get('locale')?.value;

  // Set default locale cookie if missing
  if (!localeCookie) {
    res.cookies.set('locale', 'en', { path: '/', maxAge: 31536000, sameSite: 'lax' });
  }

  // If country already detected, pass through
  if (countryCookie && /^[A-Z]{2}$/.test(countryCookie)) {
    return res;
  }

  // Get IP from various headers
  const headers = req.headers;
  const ip =
    headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('cf-connecting-ip')?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    null;

  // Local development fallback
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    res.cookies.set('country', 'US', { path: '/', maxAge: 31536000, sameSite: 'lax' });
    res.cookies.set('currency', 'USD', { path: '/', maxAge: 31536000, sameSite: 'lax' });
    return res;
  }

  // Geo-detect via free API (with timeout)
  try {
    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (geoRes.ok) {
      const geo = await geoRes.json();
      const country = geo.country_code?.toUpperCase();
      if (country && country.length === 2) {
        const currency = geo.currency || currencyForCountry(country);
        res.cookies.set('country', country, { path: '/', maxAge: 31536000, sameSite: 'lax' });
        res.cookies.set('currency', currency, { path: '/', maxAge: 31536000, sameSite: 'lax' });
        return res;
      }
    }
  } catch {
    // Fall through to default
  }

  // Final fallback
  res.cookies.set('country', 'US', { path: '/', maxAge: 31536000, sameSite: 'lax' });
  res.cookies.set('currency', 'USD', { path: '/', maxAge: 31536000, sameSite: 'lax' });
  return res;
}

export const config = {
  // Run on all pages except API routes (which handle their own geo via /api/geo)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
