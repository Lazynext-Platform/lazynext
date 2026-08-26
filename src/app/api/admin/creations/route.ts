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
  const status = url.searchParams.get('status')?.trim() || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const where = status ? { status } : {};

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

  return NextResponse.json({ creations, total, statusCounts });
}
