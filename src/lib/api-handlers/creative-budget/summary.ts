import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CreativeBudgetBridge } from '@/lib/services/creative-budget-bridge';

/**
 * GET /api/creative-budget/summary — creative budget summary for the workspace.
 *
 * Returns total spent, by creative type, this month, and trend.
 */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    const ws = workspaces[0];
    const summary = await CreativeBudgetBridge.getCreativeBudgetSummary(
      ws.id,
      ws.organizationId,
    );

    return NextResponse.json(summary);
  } catch (e) {
    console.error('[creative-budget/summary] error:', e);
    return NextResponse.json({ error: 'failed_to_get_summary' }, { status: 500 });
  }
}
