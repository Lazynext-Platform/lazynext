import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creative/share/[token]
 * Public endpoint to view a shared asset.
 * Query: ?password=xxx
 * Returns the asset data if the link is valid and not expired.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(req.url);
  const password = url.searchParams.get('password') || '';

  const link = await prisma.sharedLink.findUnique({ where: { token } });
  if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Check expiry
  if (link.expiresAt && new Date() > link.expiresAt) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  // Check password
  if (link.password && link.password !== password) {
    return NextResponse.json({ error: 'password_required' }, { status: 403 });
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
