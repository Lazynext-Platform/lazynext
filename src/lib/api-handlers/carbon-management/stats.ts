import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CarbonManagementService } from '@/lib/services/carbon-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { inventoryCount: 0, offsetCount: 0, targetCount: 0, creditCount: 0, byInventoryType: {}, byInventoryStatus: {}, byOffsetType: {}, byOffsetStatus: {}, byTargetType: {}, byTargetStatus: {}, byCreditType: {}, byCreditStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await CarbonManagementService.getCarbonManagementStats(organizationId);
  return NextResponse.json({ stats });
}
