import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CodingLoopService } from '@/lib/services/coding-loop';

/**
 * POST /api/coding-loop/pr — create a pull request for a coding loop.
 * Body: { owner, repo, branch, base, title, body, issueNumber, taskId? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    owner?: string;
    repo?: string;
    branch?: string;
    base?: string;
    title?: string;
    body?: string;
    issueNumber?: number;
    taskId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const owner = body.owner?.trim();
  const repo = body.repo?.trim();
  const branch = body.branch?.trim();
  const base = body.base?.trim();
  const title = body.title?.trim();
  if (!owner || !repo || !branch || !base || !title) {
    return NextResponse.json({ error: 'owner_repo_branch_base_title_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces[0];

    const pr = await CodingLoopService.createPullRequest(workspace.id, session.user.id, {
      owner,
      repo,
      branch,
      base,
      title,
      body: body.body || '',
      issueNumber: body.issueNumber || 0,
      taskId: body.taskId,
    });

    return NextResponse.json({ pr }, { status: 201 });
  } catch (e) {
    console.error('[coding-loop/pr] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_create_pr' },
      { status: 500 },
    );
  }
}
