import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowExecutor } from '@/lib/services/workflow-executor';

/** POST /api/workflows/executions/[id]/resume — resume an execution after approval */
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
  const approvalResult = {
    approved: Boolean(body.approved),
    approverId: body.approverId || session.user.id,
    comment: body.comment,
  };

  try {
    const execution = await WorkflowExecutor.resumeExecution(id, approvalResult);
    if (!execution) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ execution });
  } catch (e) {
    console.error('[workflows] resume error:', e);
    return NextResponse.json({ error: 'failed_to_resume_execution' }, { status: 500 });
  }
}
