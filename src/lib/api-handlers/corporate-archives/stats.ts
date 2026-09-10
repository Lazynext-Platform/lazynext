import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateArchivesService } from '@/lib/services/corporate-archives-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { recordCount: 0, activeRecordCount: 0, archivedRecordCount: 0, collectionCount: 0, openCollectionCount: 0, accessCount: 0, pendingAccessCount: 0, digitizationCount: 0, inProgressDigitizationCount: 0, byRecordType: {}, byRecordStatus: {}, byCollectionType: {}, byCollectionStatus: {}, byAccessType: {}, byAccessStatus: {}, byDigitizationType: {}, byDigitizationStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await CorporateArchivesService.getCorporateArchivesStats(organizationId);
  return NextResponse.json({ stats });
}
