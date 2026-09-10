import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CodingLoopService } from '@/lib/services/coding-loop';

/**
 * POST /api/coding-loop/merge — verify and merge a pull request.
 * Body: { owner, repo, prNumber, taskId? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    owner?: string;
    repo?: string;
    prNumber?: number;
    taskId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const owner = body.owner?.trim();
  const repo = body.repo?.trim();
  const prNumber = body.prNumber;
  if (!owner || !repo || !prNumber) {
    return NextResponse.json({ error: 'owner_repo_pr_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces[0];

    const result = await CodingLoopService.verifyAndMerge(workspace.id, session.user.id, {
      owner,
      repo,
      prNumber,
      taskId: body.taskId,
    });

    if (!result.merged) {
      return NextResponse.json({ error: result.error || 'merge_failed', ...result }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('[coding-loop/merge] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_merge_pr' },
      { status: 500 },
    );
  }
}
