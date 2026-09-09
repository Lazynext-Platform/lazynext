import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowService } from '@/lib/services/workflow-service';

/** GET /api/workflows/[id]/versions — get version history for a workflow */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const versions = await WorkflowService.getVersions(id);
  return NextResponse.json({ versions });
}
