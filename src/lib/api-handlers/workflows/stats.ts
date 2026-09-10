import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WorkflowService } from '@/lib/services/workflow-service';

/** GET /api/workflows/stats — get aggregate workflow stats for the organization */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: { total: 0, byStatus: {}, byTriggerType: {}, executionCount: 0 },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await WorkflowService.getStats(organizationId);
  return NextResponse.json({ stats });
}
