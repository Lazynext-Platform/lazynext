import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GitHubService } from '@/lib/services/github';

/**
 * GET /api/github/issues — list issues for a repository.
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
    const issues = await GitHubService.listIssues(session.user.id, owner, repo, state);
    return NextResponse.json({ issues });
  } catch (e) {
    console.error('[github/issues] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_issues' }, { status: 500 });
  }
}

/**
 * POST /api/github/issues — create an issue.
 * Body: { owner, repo, title, body?, labels?, assignees? }
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
    labels?: string[];
    assignees?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const owner = body.owner?.trim();
  const repo = body.repo?.trim();
  const title = body.title?.trim();
  if (!owner || !repo || !title) {
    return NextResponse.json({ error: 'owner_repo_title_required' }, { status: 400 });
  }

  try {
    const issue = await GitHubService.createIssue(session.user.id, owner, repo, {
      title,
      body: body.body,
      labels: body.labels,
      assignees: body.assignees,
    });
    if (!issue) {
      return NextResponse.json({ error: 'failed_to_create_issue' }, { status: 400 });
    }
    return NextResponse.json({ issue }, { status: 201 });
  } catch (e) {
    console.error('[github/issues] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_issue' }, { status: 500 });
  }
}
