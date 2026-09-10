import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FoodServicesService } from '@/lib/services/food-services-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { publishedMenus: 0, pendingOrders: 0, activeVendors: 0, lowStockItems: 0, totalOrders: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await FoodServicesService.getFoodServicesMetrics(organizationId);
  return NextResponse.json({ metrics });
}
