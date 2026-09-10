import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GitHubService } from '@/lib/services/github';

/**
 * GET /api/github/prs — list pull requests for a repository.
 * Query params: owner, repo, state (open|closed|all)
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  const state = (searchParams.get('state') as 'open' | 'closed' | 'all') || 'open';

  if (!owner || !repo) {
    return NextResponse.json({ error: 'owner_and_repo_required' }, { status: 400 });
  }

  try {
    const prs = await GitHubService.listPRs(session.user.id, owner, repo, state);
    return NextResponse.json({ prs });
  } catch (e) {
    console.error('[github/prs] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_prs' }, { status: 500 });
  }
}

/**
 * POST /api/github/prs — create a pull request.
 * Body: { owner, repo, title, body?, head, base, draft? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    owner?: string;
    repo?: string;
    title?: string;
    body?: string;
    head?: string;
    base?: string;
    draft?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const owner = body.owner?.trim();
  const repo = body.repo?.trim();
  const title = body.title?.trim();
  const head = body.head?.trim();
  const base = body.base?.trim();
  if (!owner || !repo || !title || !head || !base) {
    return NextResponse.json({ error: 'owner_repo_title_head_base_required' }, { status: 400 });
  }

  try {
    const pr = await GitHubService.createPR(session.user.id, owner, repo, {
      title,
      body: body.body,
      head,
      base,
      draft: body.draft,
    });
    if (!pr) {
      return NextResponse.json({ error: 'failed_to_create_pr' }, { status: 400 });
    }
    return NextResponse.json({ pr }, { status: 201 });
  } catch (e) {
    console.error('[github/prs] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_pr' }, { status: 500 });
  }
}
