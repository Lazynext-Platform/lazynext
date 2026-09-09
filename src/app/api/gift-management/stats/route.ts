import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GiftManagementService } from '@/lib/services/gift-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { itemCount: 0, recipientCount: 0, orderCount: 0, inventoryCount: 0, byItemType: {}, byItemStatus: {}, byRecipientType: {}, byRecipientStatus: {}, byOrderType: {}, byOrderStatus: {}, byInventoryType: {}, byInventoryStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await GiftManagementService.getGiftManagementStats(organizationId);
  return NextResponse.json({ stats });
}
