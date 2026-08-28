import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/creative/export
 * Body: {
 *   assetIds: string[],     // asset IDs to export (must be owned by user)
 *   format: 'json' | 'csv', // output format
 *   fields: string[],       // which fields to include: brief, hooks, angles, script, storyboard, score, variants
 * }
 *
 * Returns the exported data as a downloadable file.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const assetIds = Array.isArray(body.assetIds) ? body.assetIds : [];
  const format = String(body.format || 'json');
  const fields = Array.isArray(body.fields) ? body.fields : ['brief', 'hooks', 'angles', 'script', 'storyboard', 'score', 'variants'];

  if (assetIds.length === 0) return NextResponse.json({ error: 'assetIds_required' }, { status: 400 });
  if (!['json', 'csv'].includes(format)) return NextResponse.json({ error: 'invalid_format' }, { status: 400 });

  // Fetch owned assets
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds }, userId: uid },
    orderBy: { createdAt: 'desc' },
  });

  if (assets.length === 0) return NextResponse.json({ error: 'no_assets' }, { status: 404 });

  // Fetch children for all packages
  const allChildren = await prisma.asset.findMany({
    where: { parentId: { in: assetIds } },
    orderBy: { type: 'asc' },
  });

  // Group children by parent
  const childrenByParent: Record<string, typeof allChildren> = {};
  for (const child of allChildren) {
    if (child.parentId) {
      if (!childrenByParent[child.parentId]) childrenByParent[child.parentId] = [];
      childrenByParent[child.parentId].push(child);
    }
  }

  // Helper to parse metadata
  const parseMeta = (data: unknown): Record<string, unknown> | null => {
    if (typeof data === 'string') { try { return JSON.parse(data); } catch { return null; } }
    if (data && typeof data === 'object') return data as Record<string, unknown>;
    return null;
  };

  // Helper to get a specific child type's data
  const getChildData = (parentId: string, type: string) => {
    const children = childrenByParent[parentId] || [];
    const child = children.find(c => c.type === type);
    if (!child) return null;
    return {
      name: child.name,
      type: child.type,
      tags: child.tags,
      metadata: parseMeta(child.metadata),
      createdAt: child.createdAt.toISOString(),
    };
  };

  // Build export data
  const exportData = assets.map(asset => {
    const item: Record<string, unknown> = {
      packageName: asset.name,
      packageType: asset.type,
      packageCreatedAt: asset.createdAt.toISOString(),
    };

    for (const field of fields) {
      const childData = getChildData(asset.id, field);
      if (childData) {
        item[field] = childData.metadata || childData.name;
      } else {
        item[field] = null;
      }
    }

    return item;
  });

  if (format === 'json') {
    const jsonStr = JSON.stringify(exportData, null, 2);
    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="creative-export-${Date.now()}.json"`,
      },
    });
  } else {
    // CSV format
    const allKeys = new Set<string>();
    for (const item of exportData) {
      for (const key of Object.keys(item)) allKeys.add(key);
    }
    const headers = [...allKeys];
    const rows = exportData.map(item => {
      return headers.map(header => {
        const val = item[header];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="creative-export-${Date.now()}.csv"`,
      },
    });
  }
}
