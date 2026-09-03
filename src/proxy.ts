import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { currencyForCountry } from '@/config/pricing';
import { LOCALES } from '@/i18n/messages';

/**
 * Rate limiting: uses Cloudflare's distributed Rate Limiting API when available
 * (production on Workers), and falls back to in-memory buckets for local dev.
 *
 * Cloudflare rate-limit bindings (declared in wrangler.jsonc):
 *   API_RATE_LIMITER — 60 req/min (general API routes)
 *   AI_RATE_LIMITER  — 10 req/min (AI generation endpoints)
 *
 * The in-memory fallback provides per-isolate protection only (not distributed),
 * but is sufficient for local development.
 */
type RateBucket = { count: number; resetAt: number };
const globalForRate = globalThis as unknown as { __rateBuckets?: Map<string, RateBucket> };
const rateBuckets: Map<string, RateBucket> = globalForRate.__rateBuckets ?? new Map();
if (!globalForRate.__rateBuckets) globalForRate.__rateBuckets = rateBuckets;

// Cloudflare Rate Limit binding types (available in production Workers runtime)
interface RateLimitResult { success: boolean }
interface RateLimitLimiter {
  limit: (key: string) => Promise<RateLimitResult>;
}
interface CloudflareEnv {
  API_RATE_LIMITER?: RateLimitLimiter;
  AI_RATE_LIMITER?: RateLimitLimiter;
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

// Rate limit categories: { maxRequests, windowMs }
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  // AI generation endpoints — expensive, strict limit (10/min)
  'ai-gen': { max: 10, windowMs: 60_000 },
  // Upload endpoints — moderate limit (20/min)
  'upload': { max: 20, windowMs: 60_000 },
  // Checkout/redeem — strict to prevent abuse (5/min)
  'payment': { max: 5, windowMs: 60_000 },
  // Poll endpoints — high frequency but authenticated (60/min)
  'poll': { max: 60, windowMs: 60_000 },
  // Public API v1 — 100/min per IP (matches RateLimits.API_V1)
  'api-v1': { max: 100, windowMs: 60_000 },
  // MCP endpoint — 60/min per IP (matches RateLimits.MCP)
  'mcp': { max: 60, windowMs: 60_000 },
  // API key management — 10/min per IP
  'api-keys': { max: 10, windowMs: 60_000 },
  // Default API rate limit (30/min)
  'default': { max: 30, windowMs: 60_000 },
};

// Map API path patterns to rate limit categories
function getRateCategory(pathname: string): string {
  if (pathname.includes('/expand-prompt') || pathname.includes('/plan') ||
      pathname.includes('/shot-image') || pathname.includes('/shot-video') ||
      pathname.includes('/gen-script') || pathname.includes('/character') ||
      pathname.includes('/edit') || pathname.includes('/voice') ||
      pathname.includes('/lipsync') || pathname.includes('/motion') ||
      pathname.includes('/script') || pathname.includes('/image') ||
      pathname.includes('/video') || pathname.includes('/save') ||
      pathname.includes('/save-reel') || pathname.includes('/start')) {
    return 'ai-gen';
  }
  if (pathname.includes('/upload')) return 'upload';
  if (pathname.includes('/checkout') || pathname.includes('/redeem')) return 'payment';
  if (pathname.includes('/poll')) return 'poll';
  // Phase 5: Public API v1 and MCP endpoints
  if (pathname.startsWith('/api/v1')) return 'api-v1';
  if (pathname === '/mcp') return 'mcp';
  if (pathname.startsWith('/api/keys')) return 'api-keys';
  return 'default';
}

// Map rate categories to Cloudflare rate-limit bindings.
// AI generation endpoints use AI_RATE_LIMITER (10/min); everything else uses
// API_RATE_LIMITER (60/min). Categories with custom limits (upload, payment,
// poll, api-v1, mcp, api-keys) use the in-memory fallback for precise control.
const CF_BINDING_CATEGORIES: Record<string, 'AI_RATE_LIMITER' | 'API_RATE_LIMITER'> = {
  'ai-gen': 'AI_RATE_LIMITER',
  'default': 'API_RATE_LIMITER',
};

function checkRateLimit(ip: string, category: string): { limited: boolean; retryAfter?: number } {
  const limit = RATE_LIMITS[category] || RATE_LIMITS['default'];
  const key = `${ip}:${category}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + limit.windowMs });
    return { limited: false };
  }

  bucket.count++;
  if (bucket.count > limit.max) {
    return { limited: true, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { limited: false };
}

/**
 * Distributed rate limit check using Cloudflare Rate Limiting API.
 * Returns null if Cloudflare bindings are not available (local dev fallback).
 */
async function checkCloudflareRateLimit(
  ip: string,
  category: string,
): Promise<{ limited: boolean; retryAfter?: number } | null> {
  const bindingName = CF_BINDING_CATEGORIES[category];
  if (!bindingName) return null; // Use in-memory for custom-limit categories

  // Access Cloudflare bindings via the request's runtime env.
  // In OpenNext/Workers, bindings are available on the request's ctx.
  try {
    const env = (globalThis as unknown as { __cloudflareEnv?: CloudflareEnv }).__cloudflareEnv;
    const limiter = env?.[bindingName];
    if (!limiter) return null;

    const result = await limiter.limit(`${ip}:${category}`);
    if (!result.success) {
      return { limited: true, retryAfter: 60 };
    }
    return { limited: false };
  } catch {
    // Binding not available or error — fall back to in-memory
    return null;
  }
}

// Clean up expired buckets periodically
if (rateBuckets.size > 500) {
  const now = Date.now();
  for (const [k, b] of rateBuckets) {
    if (now >= b.resetAt) rateBuckets.delete(k);
  }
}

/**
 * Middleware: on first visit (no country cookie), detects the user's country
 * from their IP and sets country + currency cookies. Also ensures the locale
 * cookie is set if missing.
 *
 * A valid `?locale=xx` query param (advertised in the sitemap/hreflang
 * alternates) wins over the cookie: it is applied to the current request (so
 * SSR renders that locale immediately, e.g. for crawlers) and persisted to the
 * locale cookie for subsequent visits.
 *
 * This runs on every request, but only does IP geolocation once (when the
 * country cookie is absent). Subsequent requests just pass through.
 */
async function handleRequest(req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.pathname;

  // Redirect old ad-studio creative tool pages to /creative/generators
  // These page routes have been removed; the API routes remain.
  if (
    pathname.startsWith('/ad-') ||
    pathname.startsWith('/creative-ad-') ||
    pathname.startsWith('/brand-') ||
    pathname.startsWith('/brief-') ||
    pathname.startsWith('/hook-') ||
    [
      '/mood-board-generator', '/scene-analysis', '/shot-planner', '/multi-concept',
      '/reference-remix', '/repurposing', '/viral-analyzer', '/trend-spotter',
      '/trend-intelligence', '/competitor-intel', '/competitor-watch', '/concept-expander',
      '/personas', '/audience-persona-generator', '/creator-kits', '/product-brief',
      '/campaign-orchestrator', '/fatigue', '/quality-scoring', '/forecasting',
      '/budget-optimizer', '/performance-loop', '/smart-calendar', '/audience-insights',
      '/variant-matrix', '/variant-matrix-generator', '/testing-lab',
      '/ab-test-planner', '/ab-test-results', '/ab-automation',
      '/creative-brief-generator', '/creative-hook-matrix-generator', '/creative-hook-revamp-generator',
      '/creative-messaging-framework-builder', '/creative-scene-generator', '/creative-format-converter',
      '/creative-format-recommender', '/creative-visual-hierarchy-analyzer', '/creative-fatigue-detector',
      '/creative-performance-forecaster', '/creative-trend-adapter', '/creative-quality-scorer',
      '/creative-sentiment-journey-mapper', '/creative-concept-expander-pro',
      '/creative-concept-validator', '/creative-diff', '/creative-assets',
      '/angle-finder', '/hook-tester', '/hook-library', '/brief-template-builder',
      '/ad-script-writer', '/brief-analyzer', '/ad-format-optimizer', '/inspiration',
    ].includes(pathname)
  ) {
    return NextResponse.redirect(new URL('/creative/generators', req.url), 308);
  }

  // Path-based locale routing: /zh, /zh/lazynext-studio, etc.
  // Strip the locale prefix, set the cookie, and rewrite to the bare path.
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0] || '';
  const isLocalePath = (LOCALES as readonly string[]).includes(firstSegment);

  let localeParam = req.nextUrl.searchParams.get('locale') || '';
  let rewritePath = pathname;

  if (isLocalePath) {
    localeParam = firstSegment;
    // Remove the locale prefix from the path
    pathSegments.shift();
    rewritePath = '/' + pathSegments.join('/');
    // Preserve trailing slash if original had one and there are remaining segments
    if (pathSegments.length === 0) rewritePath = '/';
  }

  const validLocaleParam = (LOCALES as readonly string[]).includes(localeParam) ? localeParam : '';

  // When a valid locale is determined (from path or query), set the cookie
  const res = validLocaleParam
    ? (() => {
        req.cookies.set('locale', validLocaleParam);
        const next = NextResponse.next({ request: { headers: req.headers } });
        // Rewrite to the bare path so Next.js renders the correct page
        if (isLocalePath) {
          const url = req.nextUrl.clone();
          url.pathname = rewritePath;
          url.searchParams.delete('locale');
          return NextResponse.rewrite(url, { request: { headers: req.headers } });
        }
        return next;
      })()
    : NextResponse.next();
  if (validLocaleParam) {
    res.cookies.set('locale', validLocaleParam, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  }

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

  // Get IP from various headers.
  // Trust cf-connecting-ip first (set by Cloudflare and not client-spoofable),
  // then fall back to x-forwarded-for and x-real-ip for local dev / other proxies.
  const headers = req.headers;
  const ip =
    headers.get('cf-connecting-ip')?.trim() ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    null;

  // Local development fallback
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    res.cookies.set('country', 'US', { path: '/', maxAge: 31536000, sameSite: 'lax' });
    res.cookies.set('currency', 'USD', { path: '/', maxAge: 31536000, sameSite: 'lax' });
    return res;
  }

  // On Cloudflare Workers, use the cf-ipcountry header (set by Cloudflare on
  // every request) for instant geo detection. The req.cf property is not
  // available on the Next.js Request object in the OpenNext adapter.
  // If the header is absent (e.g. local dev), we fall back to ipapi.co.
  const cfCountry = headers.get('cf-ipcountry')?.trim();
  if (cfCountry && /^[A-Z]{2}$/.test(cfCountry)) {
    const country = cfCountry.toUpperCase();
    const currency = currencyForCountry(country);
    res.cookies.set('country', country, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    res.cookies.set('currency', currency, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    return res;
  }

  // Fallback: external geo API (when Cloudflare headers are not available)
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

// Baseline security headers for every response. CSP uses a per-request nonce
// for inline scripts (theme bootstrap + Next.js hydration scripts); styles
// still require 'unsafe-inline' because Tailwind injects inline styles.
// In development, React/Turbopack requires 'unsafe-eval' for stack
// reconstruction; production keeps the strict policy (no unsafe-eval).
const isDev = process.env.NODE_ENV !== 'production';

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' blob: https://static.cloudflareinsights.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: https:${isDev ? ' http://localhost:3099' : ''}`,
    `media-src 'self' blob: https:${isDev ? ' http://localhost:3099' : ''}`,
    `connect-src 'self' https://*.atlascloud.ai https://*.dodopayments.com https://cloudflareinsights.com https://unpkg.com${isDev ? ' http://localhost:3099' : ''}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
}

const STATIC_SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

export function applySecurityHeaders(res: NextResponse, nonce?: string): NextResponse {
  for (const [k, v] of Object.entries(STATIC_SECURITY_HEADERS)) res.headers.set(k, v);
  res.headers.set('Content-Security-Policy', buildCsp(nonce || crypto.randomUUID()));
  return res;
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.pathname;
  const rawUrl = req.url;

  // CVE-2026-3125 mitigation: Block /cdn-cgi/ path normalization bypass.
  // @opennextjs/cloudflare <=1.17.0 has an SSRF via backslash bypass
  // (/cdn-cgi\image/ instead of /cdn-cgi/image/). Browsers normalize
  // backslashes, so this only affects non-browser HTTP clients (curl --path-as-is).
  // Block any request whose raw URL contains /cdn-cgi followed by a backslash.
  if (/\/cdn-cgi[\\/]/i.test(rawUrl) || /\/cdn-cgi[\\/]/i.test(pathname)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Generate a per-request CSP nonce for inline scripts
  const nonce = crypto.randomUUID();

  // API routes: apply rate limiting + security headers only (no geo/locale)
  // Skip rate limiting for webhooks (external service callbacks) and auth callbacks
  if (pathname.startsWith('/api/')) {
    const isWebhook = pathname.startsWith('/api/webhook/');
    const isAuth = pathname.startsWith('/api/auth/');
    const isHealth = pathname === '/api/health';
    if (!isWebhook && !isAuth && !isHealth) {
      // Skip rate limiting in test/E2E environment to avoid flaky skips
      const skipRateLimit = process.env.NODE_ENV === 'test' || process.env.E2E_NO_RATE_LIMIT === '1';
      if (!skipRateLimit) {
        const ip = getClientIP(req);
        const category = getRateCategory(pathname);
        // Try Cloudflare distributed rate limiter first, fall back to in-memory
        const cfResult = await checkCloudflareRateLimit(ip, category);
        const { limited, retryAfter } = cfResult ?? checkRateLimit(ip, category);
        if (limited) {
          const res = NextResponse.json(
            { error: 'rate_limited', retryAfter },
            { status: 429, headers: { 'Retry-After': String(retryAfter || 60) } },
          );
          return applySecurityHeaders(res, nonce);
        }
      }
    }
    return applySecurityHeaders(NextResponse.next(), nonce);
  }

  // Defense-in-depth: redirect unauthenticated users away from protected pages.
  // Individual pages still call auth() — this is a secondary check based on the
  // presence of a NextAuth session cookie. If no session cookie exists, redirect
  // to /login. Pages that render public CTAs (dashboard, settings) handle their
  // own auth display; this catches the remaining routes that should be guarded.
  const protectedPrefixes = [
    '/admin', '/analytics', '/automations', '/calendar', '/conversations',
    '/documents', '/files', '/integrations', '/onboarding', '/people',
    '/projects', '/search', '/tasks', '/workspaces',
  ];
  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isProtected) {
    const sessionCookie = req.cookies.get('next-auth.session-token')?.value ||
      req.cookies.get('__Secure-next-auth.session-token')?.value;
    if (!sessionCookie) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl), nonce);
    }
  }

  // Page routes: geo/locale + security headers
  // Pass nonce to the page via a request header so layout.tsx can apply it
  // to inline scripts (theme bootstrap + Next.js hydration).
  const pageRes = await handleRequest(req);
  pageRes.headers.set('x-csp-nonce', nonce);
  return applySecurityHeaders(pageRes, nonce);
}

export const config = {
  // Run on all pages AND API routes (API routes get rate limiting + security headers)
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
