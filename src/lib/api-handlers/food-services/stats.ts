import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FoodServicesService } from '@/lib/services/food-services-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { menuCount: 0, orderCount: 0, vendorCount: 0, inventoryCount: 0, byMenuType: {}, byMenuStatus: {}, byOrderType: {}, byOrderStatus: {}, byVendorType: {}, byVendorStatus: {}, byInventoryType: {}, byInventoryStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await FoodServicesService.getFoodServicesStats(organizationId);
  return NextResponse.json({ stats });
}
