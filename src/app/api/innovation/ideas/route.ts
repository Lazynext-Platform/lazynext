import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InnovationService } from '@/lib/services/innovation-service';

/** GET /api/innovation/ideas — list ideas */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ ideas: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; stage?: string; submittedBy?: string } = {};
  const category = url.searchParams.get('category');
  const stage = url.searchParams.get('stage');
  const submittedBy = url.searchParams.get('submittedBy');
  if (category) opts.category = category;
  if (stage) opts.stage = stage;
  if (submittedBy) opts.submittedBy = submittedBy;

  const ideas = await InnovationService.listIdeas(organizationId, opts as never);
  return NextResponse.json({ ideas });
}

/** POST /api/innovation/ideas — create an idea */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const category = String(body.category || '').trim();
  const submittedBy = String(body.submittedBy || '').trim();
  if (!title || !category || !submittedBy) {
    return NextResponse.json({ error: 'title_category_submittedBy_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const idea = await InnovationService.createIdea(
      ws.organizationId, ws.id,
      {
        title, category: category as never, submittedBy,
        description: body.description, stage: body.stage, tags: body.tags,
        estimatedValue: body.estimatedValue, estimatedEffort: body.estimatedEffort, votes: body.votes,
      },
      session.user.id,
    );
    return NextResponse.json({ idea }, { status: 201 });
  } catch (e) {
    console.error('[innovation/ideas] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_idea' }, { status: 500 });
  }
}
