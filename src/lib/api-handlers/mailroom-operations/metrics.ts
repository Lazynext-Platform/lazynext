import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MailroomOperationsService } from '@/lib/services/mailroom-operations-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { pendingItems: 0, inTransitDeliveries: 0, activeRoutes: 0, pendingPostage: 0, deliveredToday: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await MailroomOperationsService.getMailroomOperationsMetrics(organizationId);
  return NextResponse.json({ metrics });
}
