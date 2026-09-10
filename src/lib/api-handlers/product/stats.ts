import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ProductManagementService } from '@/lib/services/product-management-service';

/** GET /api/product/stats — get product management stats */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      totalIdeas: 0,
      ideasByStatus: {},
      releases: { total: 0, byStatus: {} },
      roadmap: { total: 0, byStatus: {} },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await ProductManagementService.getStats(organizationId);
  return NextResponse.json(stats);
}
