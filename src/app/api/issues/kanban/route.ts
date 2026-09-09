import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IssueService } from '@/lib/services/issue-service';

/** GET /api/issues/kanban — get issues grouped by status (kanban board) */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ columns: { open: [], in_progress: [], in_review: [], done: [], closed: [] } });
  }

  const organizationId = workspaces[0].organizationId;
  const columns = await IssueService.getByStatus(organizationId);
  return NextResponse.json({ columns });
}
