import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

/**
 * GET /api/admin/creations — list all creations across all users.
 * Supports ?status=processing&limit=50&offset=0 for filtering and pagination.
 */
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const rawStatus = url.searchParams.get('status')?.trim() || '';
  // Allowlist status filter to prevent arbitrary query injection.
  const VALID_STATUSES = ['processing', 'completed', 'failed', 'persisting'];
  const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);

  const where = status ? { status } : {};

  // Retry up to 3 times on cold start — Prisma/D1 may not be ready on the
  // first request after a Cloudflare Worker isolate is created.
  // If all retries fail, return 200 with empty result (not 500) so the admin
  // UI stays usable. The client will re-fetch once the isolate is warm.
  const delays = [200, 500, 1000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const [creations, total, statusCounts] = await Promise.all([
        prisma.creation.findMany({
          where,
          select: {
            id: true,
            userId: true,
            templateId: true,
            status: true,
            prompt: true,
            cost: true,
            error: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.creation.count({ where }),
        prisma.creation.groupBy({
          by: ['status'],
          _count: true,
        }),
      ]);
      return NextResponse.json({
        creations: creations.map((c) => ({ ...c, error: c.status === 'failed' ? 'generation_failed' : null })),
        total,
        statusCounts,
      });
    } catch (e) {
      if (attempt < delays.length) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }
      return NextResponse.json({ creations: [], total: 0, statusCounts: [] });
    }
  }
  return NextResponse.json({ creations: [], total: 0, statusCounts: [] });
}
