import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { WorkspaceService } from '@/lib/services/workspace';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * GET /api/knowledge/search — unified search across documents, memories, and research.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || undefined;
  const query = sp.get('q') || '';
  const entityType = sp.get('entityType') || undefined;
  const tagsParam = sp.get('tags');
  const limitParam = sp.get('limit');

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasOrg = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasOrg) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const results = await KnowledgeService.search(organizationId, query, {
      entityType: entityType || undefined,
      tags,
      limit,
    });

    return NextResponse.json({ results });
  } catch (e) {
    console.error('[knowledge/search] error:', e);
    return NextResponse.json({ error: 'failed_to_search' }, { status: 500 });
  }
}
