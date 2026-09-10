import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BrandManagementService } from '@/lib/services/brand-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { guidelineCount: 0, assetCount: 0, auditCount: 0, consistencyCount: 0, byGuidelineCategory: {}, byGuidelineStatus: {}, byAssetType: {}, byAssetStatus: {}, byAuditStatus: {}, byConsistencyStatus: {}, byConsistencySeverity: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await BrandManagementService.getBrandManagementStats(organizationId);
  return NextResponse.json({ stats });
}
