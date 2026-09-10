import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { safeError } from '@/lib/security';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';
import {
  AutonomyLoopService,
  type AutonomyLoopConfig,
  type AutonomyMode,
} from '@/lib/services/autonomy-loop';

/**
 * GET /api/autonomy-loops?workspaceId=...
 * List active autonomy loops for the workspace.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  try {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);
    if (!wsIds.includes(workspaceId)) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Not a member of this workspace' },
        { status: 403 },
      );
    }

    const rows = await prisma.memory.findMany({
      where: { type: 'autonomy_loop', workspaceId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const loops = rows.map((row) => {
      let content: Record<string, unknown> = {};
      try {
        content = JSON.parse(row.content);
      } catch {
        content = {};
      }
      return {
        id: row.id,
        agentId: (content.agentId as string) ?? row.sourceId ?? '',
        currentState: (content.currentState as string) ?? 'idle',
        mode: (content.mode as AutonomyMode) ?? 'manual',
        iteration: (content.iteration as number) ?? 0,
        paused: (content.paused as boolean) ?? false,
        stopped: (content.stopped as boolean) ?? false,
        updatedAt: row.updatedAt,
      };
    });

    return NextResponse.json({ loops });
  } catch (e) {
    return NextResponse.json(safeError(e, 'autonomy-loops', 'list_failed'), { status: 500 });
  }
}

/**
 * POST /api/autonomy-loops
 * Create a new autonomy loop.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  let body: {
    agentId?: string;
    workspaceId?: string;
    organizationId?: string;
    mode?: AutonomyMode;
    intervalMs?: number;
    maxIterations?: number;
    pauseOnApprovalRequired?: boolean;
    pauseOnBudgetExceeded?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const agentId = body.agentId?.trim();
  const workspaceId = body.workspaceId?.trim();
  if (!agentId || !workspaceId) {
    return NextResponse.json({ error: 'agentId_and_workspaceId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);
    if (!wsIds.includes(workspaceId)) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Not a member of this workspace' },
        { status: 403 },
      );
    }

    const organizationId = body.organizationId?.trim() || workspaceId;

    const config: AutonomyLoopConfig = {
      agentId,
      organizationId,
      workspaceId,
      mode: body.mode ?? 'manual',
      intervalMs: body.intervalMs,
      maxIterations: body.maxIterations,
      pauseOnApprovalRequired: body.pauseOnApprovalRequired ?? true,
      pauseOnBudgetExceeded: body.pauseOnBudgetExceeded ?? true,
    };

    const loop = await AutonomyLoopService.createLoop(config);
    return NextResponse.json({ loop }, { status: 201 });
  } catch (e) {
    return NextResponse.json(safeError(e, 'autonomy-loops', 'create_failed'), { status: 500 });
  }
}
