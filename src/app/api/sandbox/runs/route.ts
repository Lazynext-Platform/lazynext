import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SandboxService } from '@/lib/services/sandbox';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/sandbox/runs — list sandbox runs (query: workspaceId, status).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;
  const status = sp.get('status') || undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const runs = await SandboxService.listRuns(workspaceId, {
      status: status as 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled' | undefined,
    });
    return NextResponse.json({ runs });
  } catch (e) {
    console.error('[sandbox/runs] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_runs' }, { status: 500 });
  }
}

/**
 * POST /api/sandbox/runs — create + execute a sandbox run.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    language?: string;
    code?: string;
    timeoutSec?: number;
    agentRunId?: string;
    taskId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  const language = body.language?.trim() as 'javascript' | 'typescript' | 'python' | 'shell' | undefined;
  if (!language) {
    return NextResponse.json({ error: 'language_required' }, { status: 400 });
  }

  const validLanguages = ['javascript', 'typescript', 'python', 'shell'];
  if (!validLanguages.includes(language)) {
    return NextResponse.json({ error: 'invalid_language' }, { status: 400 });
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: 'code_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Check quota
    const quota = await SandboxService.checkQuota(workspaceId);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: 'quota_exceeded', used: quota.used, limit: quota.limit },
        { status: 429 },
      );
    }

    const run = await SandboxService.run(workspaceId, {
      language,
      code,
      timeoutSec: body.timeoutSec,
      agentRunId: body.agentRunId?.trim() || undefined,
      taskId: body.taskId?.trim() || undefined,
    });
    return NextResponse.json({ run }, { status: 201 });
  } catch (e) {
    console.error('[sandbox/runs] create error:', e);
    return NextResponse.json({ error: 'failed_to_execute_run' }, { status: 500 });
  }
}
