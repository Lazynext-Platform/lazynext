import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowExecutor } from '@/lib/services/workflow-executor';

/** GET /api/workflows/executions/[id] — get a single execution by id */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const execution = await WorkflowExecutor.getExecution(id);
  if (!execution) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ execution });
}
