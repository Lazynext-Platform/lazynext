import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** POST /api/document-management/documents/[id]/versions/[vid] — restore a version */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id, vid } = await params;
  try {
    const document = await DocumentManagementService.restoreVersion(id, vid);
    if (!document) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ document });
  } catch (e) {
    console.error('[document-management/versions] restore error:', e);
    return NextResponse.json({ error: 'failed_to_restore_version' }, { status: 500 });
  }
}
