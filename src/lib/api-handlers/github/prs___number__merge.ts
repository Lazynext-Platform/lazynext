import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GitHubService } from '@/lib/services/github';

/**
 * POST /api/github/prs/[number]/merge — merge a pull request.
 * Body: { owner, repo, commitTitle?, method? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { number: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { number } = params;
  const prNumber = Number(number);
  if (!Number.isFinite(prNumber)) {
    return NextResponse.json({ error: 'invalid_pr_number' }, { status: 400 });
  }

  let body: {
    owner?: string;
    repo?: string;
    commitTitle?: string;
    method?: 'merge' | 'squash' | 'rebase';
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const owner = body.owner?.trim();
  const repo = body.repo?.trim();
  if (!owner || !repo) {
    return NextResponse.json({ error: 'owner_and_repo_required' }, { status: 400 });
  }

  try {
    const result = await GitHubService.mergePR(session.user.id, owner, repo, prNumber, {
      commitTitle: body.commitTitle,
      method: body.method,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, sha: result.sha });
  } catch (e) {
    console.error('[github/prs/merge] error:', e);
    return NextResponse.json({ ok: false, error: 'failed_to_merge_pr' }, { status: 500 });
  }
}
