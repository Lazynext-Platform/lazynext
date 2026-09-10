import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BrandManagementService } from '@/lib/services/brand-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeGuidelines: 0, activeAssets: 0, pendingAudits: 0, complianceIssues: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await BrandManagementService.getBrandManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
