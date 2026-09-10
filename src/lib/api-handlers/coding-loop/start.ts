import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CodingLoopService } from '@/lib/services/coding-loop';

/**
 * POST /api/coding-loop/start — start a coding loop from a GitHub issue.
 * Body: { owner, repo, issueNumber, agentId? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    owner?: string;
    repo?: string;
    issueNumber?: number;
    agentId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const owner = body.owner?.trim();
  const repo = body.repo?.trim();
  const issueNumber = body.issueNumber;
  if (!owner || !repo || !issueNumber) {
    return NextResponse.json({ error: 'owner_repo_issue_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces[0];

    const result = await CodingLoopService.startCodingLoop(workspace.id, session.user.id, {
      owner,
      repo,
      issueNumber,
      agentId: body.agentId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('[coding-loop/start] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_start_coding_loop' },
      { status: 500 },
    );
  }
}
