import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { APService } from '@/lib/services/ap-service';

/** GET /api/invoicing/ap/upcoming — get upcoming payments */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ upcomingPayments: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const upcomingPayments = await APService.getUpcomingPayments(organizationId);
  return NextResponse.json({ upcomingPayments });
}
