import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FeatureIdeaService } from '@/lib/services/product-management-service';

/** GET /api/product/ideas/[id] — get a single feature idea */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const idea = await FeatureIdeaService.get(id);
  if (!idea) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ idea });
}

/** PATCH /api/product/ideas/[id] — update a feature idea */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const idea = await FeatureIdeaService.update(id, {
      title: body.title,
      description: body.description,
      category: body.category,
      status: body.status,
      priority: body.priority,
      impact: body.impact,
      effort: body.effort,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      assignedToId: body.assignedToId,
      releaseId: body.releaseId,
      estimatedValue: body.estimatedValue,
    });
    return NextResponse.json({ idea });
  } catch (e) {
    console.error('[product/ideas] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_idea' }, { status: 500 });
  }
}

/** DELETE /api/product/ideas/[id] — delete a feature idea */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await FeatureIdeaService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[product/ideas] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_idea' }, { status: 500 });
  }
}
