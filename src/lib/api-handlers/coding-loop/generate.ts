import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CodingLoopService } from '@/lib/services/coding-loop';

/**
 * POST /api/coding-loop/generate — generate code for a file.
 * Body: { owner, repo, branch, filePath, issueContext, agentId? }
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
    filePath?: string;
    issueContext?: string;
    agentId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const owner = body.owner?.trim();
  const repo = body.repo?.trim();
  const branch = body.branch?.trim();
  const filePath = body.filePath?.trim();
  const issueContext = body.issueContext?.trim();
  if (!owner || !repo || !branch || !filePath || !issueContext) {
    return NextResponse.json({ error: 'owner_repo_branch_file_context_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces[0];

    const result = await CodingLoopService.generateCode(workspace.id, session.user.id, {
      owner,
      repo,
      branch,
      filePath,
      issueContext,
      agentId: body.agentId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('[coding-loop/generate] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_generate_code' },
      { status: 500 },
    );
  }
}
