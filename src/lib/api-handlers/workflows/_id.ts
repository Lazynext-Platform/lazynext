import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowService } from '@/lib/services/workflow-service';

/** GET /api/workflows/[id] — get a single workflow */
export async function GET(
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
  return NextResponse.json({ workflow });
}

/** PATCH /api/workflows/[id] — update a workflow */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const workflow = await WorkflowService.update(id, {
      name: body.name,
      description: body.description,
      nodes: body.nodes,
      edges: body.edges,
      variables: body.variables,
      config: body.config,
      status: body.status,
    });
    if (!workflow) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ workflow });
  } catch (e) {
    console.error('[workflows] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_workflow' }, { status: 500 });
  }
}

/** DELETE /api/workflows/[id] — delete a workflow */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await WorkflowService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[workflows] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_workflow' }, { status: 500 });
  }
}
