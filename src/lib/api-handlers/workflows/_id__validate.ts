import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowService } from '@/lib/services/workflow-service';

/** POST /api/workflows/[id]/validate — validate a workflow definition */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const workflow = await WorkflowService.get(id);
  if (!workflow) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const result = WorkflowService.validate(workflow);
  return NextResponse.json(result);
}
