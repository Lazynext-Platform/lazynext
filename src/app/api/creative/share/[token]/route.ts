import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/security';
import { checkAuthRateLimit, getClientIP } from '@/lib/auth-rate-limit';

/**
 * GET /api/creative/share/[token]
 * Public endpoint to view a shared asset.
 * Query: ?password=xxx
 * Returns the asset data if the link is valid and not expired.
 * Rate-limited to prevent token enumeration and password brute-forcing.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(req.url);
  const password = url.searchParams.get('password') || '';

  // Rate limit: 30 requests per minute per IP for share access
  const ip = getClientIP(req);
  const rl = checkAuthRateLimit(ip, 'share-view', 30, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } },
    );
  }

  const link = await prisma.sharedLink.findUnique({ where: { token } });
  if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Check expiry
  if (link.expiresAt && new Date() > link.expiresAt) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  // Check password (hashed with SHA-256 + salt)
  if (link.password) {
    // Stricter rate limit for password-protected shares: 10 attempts per minute
    const pwRl = checkAuthRateLimit(ip, `share-pw:${link.id}`, 10, 60_000);
    if (pwRl.limited) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: pwRl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(pwRl.retryAfter || 60) } },
      );
    }
    const ok = await verifyPassword(password, link.password);
    if (!ok) {
      return NextResponse.json({ error: 'password_required' }, { status: 403 });
    }
  }

  // Increment views
  await prisma.sharedLink.update({ where: { id: link.id }, data: { views: { increment: 1 } } });

  // Fetch the asset
  const asset = await prisma.asset.findUnique({ where: { id: link.assetId } });
  if (!asset) return NextResponse.json({ error: 'asset_deleted' }, { status: 404 });

  return NextResponse.json({
    asset: {
      id: asset.id,
      type: asset.type,
      name: asset.name,
      tags: asset.tags,
      metadata: asset.metadata,
      createdAt: asset.createdAt.toISOString(),
    },
    hasPassword: !!link.password,
    expiresAt: link.expiresAt?.toISOString() || null,
    views: link.views + 1,
  });
}
