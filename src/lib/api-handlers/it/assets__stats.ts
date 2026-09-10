import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITAssetService } from '@/lib/services/it-asset-service';

/** GET /api/it/assets/stats — get IT asset stats */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ total: 0, byType: {}, byStatus: {} });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await ITAssetService.getStats(organizationId);
  return NextResponse.json(stats);
}
