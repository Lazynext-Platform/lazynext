import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowExecutor } from '@/lib/services/workflow-executor';

/** POST /api/workflows/executions/[id]/cancel — cancel an execution */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const execution = await WorkflowExecutor.cancelExecution(id);
    if (!execution) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ execution });
  } catch (e) {
    console.error('[workflows] cancel error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_execution' }, { status: 500 });
  }
}
