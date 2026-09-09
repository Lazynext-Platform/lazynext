import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** GET /api/document-management/retention/expired — list expired documents */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ documents: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const documents = await DocumentManagementService.getExpiredDocuments(organizationId);
  return NextResponse.json({ documents });
}
