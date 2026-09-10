import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetTrackingService } from '@/lib/services/asset-tracking-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { assetCount: 0, assignmentCount: 0, activeAssignmentCount: 0, depreciationCount: 0, activeDepreciationCount: 0, auditCount: 0, completedAuditCount: 0, byAssetCategory: {}, byAssetStatus: {}, byAssetCondition: {}, byAssignmentStatus: {}, byDepreciationStatus: {}, byAuditType: {}, byAuditStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await AssetTrackingService.getAssetTrackingStats(organizationId);
  return NextResponse.json({ stats });
}
