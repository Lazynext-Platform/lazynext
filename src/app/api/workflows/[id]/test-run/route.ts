import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowExecutor } from '@/lib/services/workflow-executor';

/** POST /api/workflows/[id]/test-run — dry-run a workflow without side effects */
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
  const testInput = body.input || body.testInput || {};

  try {
    const result = await WorkflowExecutor.testRun(id, testInput);
    return NextResponse.json({ result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_test_run_workflow';
    const status = msg === 'workflow_not_found' || msg === 'missing_trigger_node' ? 404 : 500;
    console.error('[workflows] test-run error:', e);
    return NextResponse.json({ error: msg }, { status });
  }
}
