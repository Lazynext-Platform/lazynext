import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;

/**
 * GET /api/creative/diff?a=xxx&b=xxx
 * Returns two creative packages side-by-side for comparison.
 * Both assets must be owned by the authenticated user.
 */
async function __byokGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const aId = url.searchParams.get('a');
  const bId = url.searchParams.get('b');
  if (!aId || !bId) return NextResponse.json({ error: 'a_and_b_required' }, { status: 400 });

  const [assetA, assetB] = await Promise.all([
    prisma.asset.findFirst({ where: { id: aId, userId: uid } }),
    prisma.asset.findFirst({ where: { id: bId, userId: uid } }),
  ]);

  if (!assetA || !assetB) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Fetch children for both packages
  const [childrenA, childrenB] = await Promise.all([
    prisma.asset.findMany({ where: { parentId: aId }, orderBy: { type: 'asc' } }),
    prisma.asset.findMany({ where: { parentId: bId }, orderBy: { type: 'asc' } }),
  ]);

  // Helper to extract a specific child type
  const getChild = (children: typeof childrenA, type: string) =>
    children.find(c => c.type === type);

  // Helper to parse metadata
  const parseMeta = (data: unknown): Record<string, unknown> | null => {
    if (typeof data === 'string') { try { return JSON.parse(data); } catch { return null; } }
    if (data && typeof data === 'object') return data as Record<string, unknown>;
    return null;
  };

  // Build comparison data
  const types = ['brief', 'hooks', 'angles', 'script', 'storyboard', 'score', 'variants'];
  const comparison = types.map(type => {
    const childA = getChild(childrenA, type);
    const childB = getChild(childrenB, type);
    const metaA = childA ? parseMeta(childA.metadata) : null;
    const metaB = childB ? parseMeta(childB.metadata) : null;

    // For score, extract the overall score for delta calculation
    let scoreA: number | null = null;
    let scoreB: number | null = null;
    if (type === 'score') {
      scoreA = metaA && typeof metaA.overall === 'number' ? metaA.overall : null;
      scoreB = metaB && typeof metaB.overall === 'number' ? metaB.overall : null;
    }

    return {
      type,
      a: childA ? { id: childA.id, name: childA.name, metadata: metaA } : null,
      b: childB ? { id: childB.id, name: childB.name, metadata: metaB } : null,
      scoreA,
      scoreB,
      scoreDelta: scoreA !== null && scoreB !== null ? scoreB - scoreA : null,
      onlyInA: childA && !childB,
      onlyInB: childB && !childA,
    };
  });

  return NextResponse.json({
    a: { id: assetA.id, name: assetA.name, type: assetA.type, createdAt: assetA.createdAt.toISOString() },
    b: { id: assetB.id, name: assetB.name, type: assetB.type, createdAt: assetB.createdAt.toISOString() },
    comparison,
  });
}

export const GET = withAtlas(__byokGET);
