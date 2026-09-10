import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** GET /api/document-management/audit-trail/[documentId] — get audit trail for a document */
export async function GET(
  _req: NextRequest,
  { params }: { params: { documentId: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { documentId } = params;
  const events = await DocumentManagementService.getAuditTrail(documentId);
  return NextResponse.json({ events });
}
