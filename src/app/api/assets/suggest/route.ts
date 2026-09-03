import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/assets/suggest
 * Returns asset suggestions based on brief context (product, audience, platform, industry).
 *
 * Query params:
 *   - product: product name/text
 *   - audience: target audience
 *   - platform: target platform
 *   - limit: max results (default 10, max 30)
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const product = (url.searchParams.get('product') || '').toLowerCase().slice(0, 200);
  const audience = (url.searchParams.get('audience') || '').toLowerCase().slice(0, 200);
  const platform = (url.searchParams.get('platform') || '').toLowerCase().slice(0, 50);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10') || 10, 1), 30);

  // Fetch all user assets of type image/video
  const assets = await prisma.asset.findMany({
    where: { userId: uid, type: { in: ['image', 'video'] } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Score each asset based on tag/metadata matches with the brief context
  const scored = assets.map((asset) => {
    let score = 0;
    let tags: string[] = [];
    let metadata: Record<string, unknown> = {};

    if (typeof asset.tags === 'string') {
      try { tags = JSON.parse(asset.tags); } catch { tags = []; }
    } else if (Array.isArray(asset.tags)) {
      tags = asset.tags as string[];
    }

    if (typeof asset.metadata === 'string') {
      try { metadata = JSON.parse(asset.metadata); } catch { metadata = {}; }
    } else if (asset.metadata && typeof asset.metadata === 'object') {
      metadata = asset.metadata as Record<string, unknown>;
    }

    const autoTag = (metadata.autoTag || {}) as Record<string, unknown>;
    const assetProductType = String(autoTag.productType || '').toLowerCase();
    const assetMood = String(autoTag.mood || '').toLowerCase();
    const description = String(autoTag.description || '').toLowerCase();

    // Score based on product type match
    if (product) {
      if (assetProductType && product.includes(assetProductType)) score += 30;
      if (description && (product.includes(description.slice(0, 20)) || description.includes(product.slice(0, 10)))) score += 20;
      for (const tag of tags) {
        if (product.includes(tag.toLowerCase())) score += 10;
      }
    }

    // Score based on audience match
    if (audience) {
      for (const tag of tags) {
        if (audience.includes(tag.toLowerCase())) score += 10;
      }
      if (assetMood && ((audience.includes('young') && assetMood.includes('energetic')) || (audience.includes('professional') && assetMood.includes('professional')))) score += 15;
    }

    // Score based on platform match
    if (platform && tags.some((t) => t.toLowerCase().includes(platform))) score += 15;

    // Prefer assets with auto-tags
    if (Object.keys(autoTag).length > 0) score += 5;

    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      sourceUrl: asset.sourceUrl,
      tags,
      score,
      autoTag,
    };
  });

  // Sort by score descending and return top results
  const suggestions = scored
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // If no scored matches, return recent assets as fallback
  const fallback = suggestions.length === 0
    ? scored.slice(0, Math.min(5, limit))
    : [];

  return NextResponse.json({
    suggestions,
    fallback,
    totalAssets: assets.length,
  });
}
