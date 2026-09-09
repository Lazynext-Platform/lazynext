import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowExecutor } from '@/lib/services/workflow-executor';

/** POST /api/workflows/[id]/execute — execute a workflow */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const input = body.input || {};

  try {
    const execution = await WorkflowExecutor.execute(id, input, {
      startedBy: session.user.id,
    });
    return NextResponse.json({ execution }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_execute_workflow';
    const status = msg === 'workflow_not_found' || msg === 'missing_trigger_node' ? 404 : 500;
    console.error('[workflows] execute error:', e);
    return NextResponse.json({ error: msg }, { status });
  }
}
