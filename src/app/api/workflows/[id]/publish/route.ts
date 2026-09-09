import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowService } from '@/lib/services/workflow-service';

/** POST /api/workflows/[id]/publish — publish a workflow */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const workflow = await WorkflowService.publish(id);
    if (!workflow) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ workflow });
  } catch (e) {
    console.error('[workflows] publish error:', e);
    return NextResponse.json({ error: 'failed_to_publish_workflow' }, { status: 500 });
  }
}
