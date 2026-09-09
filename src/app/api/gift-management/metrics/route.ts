import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GiftManagementService } from '@/lib/services/gift-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { totalItems: 0, activeRecipients: 0, pendingOrders: 0, deliveredOrders: 0, availableInventoryCount: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await GiftManagementService.getGiftManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
