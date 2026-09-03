import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { canCreateAgent } from '@/lib/plan-guard';

/**
 * POST /api/agents — create an AI agent definition.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    name?: string;
    modelProvider?: string;
    modelName?: string;
    instructions?: string;
    toolIds?: string;
    workspaceId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    // Plan limit check
    const guard = await canCreateAgent(workspace.id, session.user.id);
    if (!guard.ok) {
      return NextResponse.json(
        { error: guard.reason || 'plan_limit_exceeded', limit: guard.limit, current: guard.current, tier: guard.tier },
        { status: 402 },
      );
    }

    const agent = await prisma.agentDef.create({
      data: {
        workspaceId: workspace.id,
        name,
        modelProvider: body.modelProvider || 'atlas',
        modelName: body.modelName || 'doubao-seed-2.1-turbo',
        instructions: body.instructions || '',
        toolIds: body.toolIds || '[]',
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (e) {
    console.error('[agents] create error:', e);
    return NextResponse.json(
      { error: 'failed_to_create_agent' },
      { status: 500 },
    );
  }
}
