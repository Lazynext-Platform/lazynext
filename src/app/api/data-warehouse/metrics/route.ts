import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataWarehouseService } from '@/lib/services/data-warehouse-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activePipelines: 0, runningJobs: 0, failedJobs: 0, publishedModels: 0, qualityPassRate: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await DataWarehouseService.getDataWarehouseMetrics(organizationId);
  return NextResponse.json({ metrics });
}
