import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

/**
 * GET /api/admin/users — list all users with credits, creation count, and date.
 * Supports ?search=email&limit=50&offset=0 for pagination and search.
 */
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim() || '';
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);

  const where = search
    ? { email: { contains: search } }
    : {};

  // Retry up to 3 times on cold start — Prisma/D1 may not be ready on the
  // first request after a Cloudflare Worker isolate is created.
  // If all retries fail, return 200 with empty array (not 500) so the admin
  // UI stays usable. The client will re-fetch once the isolate is warm.
  const delays = [200, 500, 1000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            credits: true,
            createdAt: true,
            _count: { select: { creations: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where }),
      ]);
      return NextResponse.json({ users, total });
    } catch (e) {
      if (attempt < delays.length) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }
      return NextResponse.json({ users: [], total: 0 });
    }
  }
  return NextResponse.json({ users: [], total: 0 });
}
