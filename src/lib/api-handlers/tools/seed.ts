import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { seedBuiltInTools } from '@/lib/tools/built-in';

/**
 * POST /api/tools/seed — seed built-in tool definitions for the user's workspace.
 */
export async function POST(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    let totalSeeded = 0;
    for (const ws of workspaces) {
      totalSeeded += await seedBuiltInTools(ws.id);
    }

    return NextResponse.json({ seeded: totalSeeded });
  } catch (e) {
    console.error('[tools/seed] error:', e);
    return NextResponse.json({ error: 'failed_to_seed_tools' }, { status: 500 });
  }
}
