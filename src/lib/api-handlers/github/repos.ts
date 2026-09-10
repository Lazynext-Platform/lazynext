import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GitHubService } from '@/lib/services/github';

/**
 * GET /api/github/repos — list repositories for the authenticated user.
 * Query params: page, perPage
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get('perPage')) || 30));

  try {
    const repos = await GitHubService.listRepos(session.user.id, page, perPage);
    return NextResponse.json({ repos });
  } catch (e) {
    console.error('[github/repos] error:', e);
    return NextResponse.json({ error: 'failed_to_list_repos' }, { status: 500 });
  }
}
