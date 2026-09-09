import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowExecutor } from '@/lib/services/workflow-executor';

/** GET /api/workflows/[id]/executions — list executions for a workflow */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const take = url.searchParams.get('take') ? Number(url.searchParams.get('take')) : undefined;

  const executions = await WorkflowExecutor.getExecutions(id, {
    status: status as never,
    take,
  });
  return NextResponse.json({ executions });
}
