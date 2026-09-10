import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowService } from '@/lib/services/workflow-service';

/** POST /api/workflows/[id]/duplicate — duplicate a workflow */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const newName = String(body.name || '').trim();

  try {
    const workflow = await WorkflowService.duplicate(id, newName, session.user.id);
    if (!workflow) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (e) {
    console.error('[workflows] duplicate error:', e);
    return NextResponse.json({ error: 'failed_to_duplicate_workflow' }, { status: 500 });
  }
}
