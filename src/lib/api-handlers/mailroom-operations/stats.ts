import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MailroomOperationsService } from '@/lib/services/mailroom-operations-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { itemCount: 0, pendingItemCount: 0, routeCount: 0, activeRouteCount: 0, deliveryCount: 0, pendingDeliveryCount: 0, postageCount: 0, pendingPostageCount: 0, byItemType: {}, byItemStatus: {}, byRouteType: {}, byRouteStatus: {}, byDeliveryType: {}, byDeliveryStatus: {}, byPostageType: {}, byPostageStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await MailroomOperationsService.getMailroomOperationsStats(organizationId);
  return NextResponse.json({ stats });
}
