import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InventoryService } from '@/lib/services/inventory-service';

/** GET /api/inventory/summary — stock summary */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ totalItems: 0, totalQuantity: 0, totalValue: 0, lowStockCount: 0, byWarehouse: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;

  const summary = await InventoryService.getStockSummary(organizationId);
  return NextResponse.json(summary);
}
