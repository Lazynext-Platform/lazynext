import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DAMService } from '@/lib/services/dam-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { assetCount: 0, activeAssetCount: 0, collectionCount: 0, versionCount: 0, permissionCount: 0, byAssetType: {}, byAssetStatus: {}, byCollectionType: {}, byPermissionType: {}, byPermissionLevel: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await DAMService.getDAMStats(organizationId);
  return NextResponse.json({ stats });
}
