import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataWarehouseService } from '@/lib/services/data-warehouse-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { pipelineCount: 0, jobCount: 0, modelCount: 0, qualityCount: 0, byPipelineType: {}, byPipelineStatus: {}, byJobType: {}, byJobStatus: {}, byModelType: {}, byModelStatus: {}, byQualityType: {}, byQualityStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await DataWarehouseService.getDataWarehouseStats(organizationId);
  return NextResponse.json({ stats });
}
