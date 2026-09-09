import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ProductLifecycleService } from '@/lib/services/product-lifecycle-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { productCount: 0, phaseCount: 0, versionCount: 0, eolCount: 0, activeProductCount: 0, byProductStatus: {}, byPhaseType: {}, byPhaseStatus: {}, byVersionStatus: {}, byEolStatus: {}, byEolReason: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await ProductLifecycleService.getProductLifecycleStats(organizationId);
  return NextResponse.json({ stats });
}
