import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { currencyForCountry } from '@/config/pricing';

/**
 * Geo-detection endpoint: detects the user's country from their IP address
 * using a free IP geolocation API, and returns the suggested country + currency.
 * The middleware sets the country/currency cookies on every response, but this
 * endpoint is useful for explicit detection (e.g. on first visit).
 */
export async function GET(req: Request) {
  // Try to get country from cookie first (already detected)
  const existingCountry = (await cookies()).get('country')?.value;
  const existingCurrency = (await cookies()).get('currency')?.value;

  // Get IP from various headers (Vercel, Cloudflare, generic proxies)
  const headers = Object.fromEntries(req.headers.entries());
  const ip =
    headers['x-vercel-forwarded-for']?.split(',')[0]?.trim() ||
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['cf-connecting-ip']?.trim() ||
    headers['x-real-ip']?.trim() ||
    null;

  // If we already have a country cookie, return it
  if (existingCountry) {
    return NextResponse.json({
      country: existingCountry,
      currency: existingCurrency || currencyForCountry(existingCountry),
      source: 'cookie',
      ip: ip ? 'detected' : undefined,
    });
  }

  // Local development: IP will be ::1 or 127.0.0.1 — geolocation APIs can't resolve it.
  // Fall back to a default (US) so the app doesn't break.
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    const country = 'US';
    const currency = currencyForCountry(country);
    const res = NextResponse.json({ country, currency, source: 'fallback', ip: ip || null });
    res.cookies.set('country', country, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    res.cookies.set('currency', currency, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    return res;
  }

  // On Cloudflare Workers, use the cf-ipcountry header (set by Cloudflare on
  // every request) for instant geo detection. The req.cf property is not
  // available on the Next.js Request object in the OpenNext adapter.
  const cfCountry = headers['cf-ipcountry']?.trim();
  if (cfCountry && /^[A-Z]{2}$/.test(cfCountry)) {
    const country = cfCountry.toUpperCase();
    const currency = currencyForCountry(country);
    const res = NextResponse.json({ country, currency, source: 'cloudflare', ip });
    res.cookies.set('country', country, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    res.cookies.set('currency', currency, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    return res;
  }

  // Fallback: external geo API (only on non-Cloudflare platforms like Vercel)
  try {
    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { Accept: 'application/json' },
      // 5 second timeout
      signal: AbortSignal.timeout(5000),
    });
    if (geoRes.ok) {
      const geo = await geoRes.json();
      const country = geo.country_code?.toUpperCase();
      if (country && country.length === 2) {
        const currency = geo.currency || currencyForCountry(country);
        const res = NextResponse.json({ country, currency, source: 'ipapi', ip });
        res.cookies.set('country', country, { path: '/', maxAge: 31536000, sameSite: 'lax' });
        res.cookies.set('currency', currency, { path: '/', maxAge: 31536000, sameSite: 'lax' });
        return res;
      }
    }
  } catch {
    // Fall through to default
  }

  // Final fallback
  const country = 'US';
  const currency = currencyForCountry(country);
  const res = NextResponse.json({ country, currency, source: 'fallback', ip });
  res.cookies.set('country', country, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  res.cookies.set('currency', currency, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  return res;
}
