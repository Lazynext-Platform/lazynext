import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GitHubService } from '@/lib/services/github';

/**
 * GET /api/github/branches — list branches for a repository.
 * Query params: owner, repo
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');

  if (!owner || !repo) {
    return NextResponse.json({ error: 'owner_and_repo_required' }, { status: 400 });
  }

  try {
    const branches = await GitHubService.listBranches(session.user.id, owner, repo);
    return NextResponse.json({ branches });
  } catch (e) {
    console.error('[github/branches] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_branches' }, { status: 500 });
  }
}

/**
 * POST /api/github/branches — create a branch.
 * Body: { owner, repo, branchName, fromBranch? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    owner?: string;
    repo?: string;
    branchName?: string;
    fromBranch?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const owner = body.owner?.trim();
  const repo = body.repo?.trim();
  const branchName = body.branchName?.trim();
  if (!owner || !repo || !branchName) {
    return NextResponse.json({ error: 'owner_repo_branchname_required' }, { status: 400 });
  }

  try {
    const result = await GitHubService.createBranch(
      session.user.id,
      owner,
      repo,
      branchName,
      body.fromBranch,
    );
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error('[github/branches] create error:', e);
    return NextResponse.json({ ok: false, error: 'failed_to_create_branch' }, { status: 500 });
  }
}
