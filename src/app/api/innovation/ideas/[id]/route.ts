import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InnovationService } from '@/lib/services/innovation-service';

/** GET /api/innovation/ideas/[id] — get a single idea */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const idea = await InnovationService.getIdea(id);
  if (!idea) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ idea });
}

/** PATCH /api/innovation/ideas/[id] — update an idea */
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
    const idea = await InnovationService.updateIdea(id, {
      title: body.title, description: body.description, category: body.category,
      stage: body.stage, tags: body.tags, estimatedValue: body.estimatedValue,
      estimatedEffort: body.estimatedEffort,
    });
    if (!idea) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ idea });
  } catch (e) {
    console.error('[innovation/ideas] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_idea' }, { status: 500 });
  }
}
