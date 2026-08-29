import { serveMedia } from '@/lib/media-storage';
import { checkAuthRateLimit, getClientIP } from '@/lib/auth-rate-limit';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Media keys are unguessable UUIDs (capability tokens), similar to S3
// presigned URLs. We rate-limit the endpoint to prevent key enumeration
// attacks, but do not require authentication so that shared links can
// embed media URLs that work for unauthenticated viewers.
const MEDIA_RATE_LIMIT = 120; // requests per minute per IP

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const ip = getClientIP(request);
  const rl = checkAuthRateLimit(ip, 'media-serve', MEDIA_RATE_LIMIT, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } },
    );
  }
  return serveMedia(request, key, true);
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const ip = getClientIP(request);
  const rl = checkAuthRateLimit(ip, 'media-serve', MEDIA_RATE_LIMIT, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } },
    );
  }
  return serveMedia(request, key, false);
}
