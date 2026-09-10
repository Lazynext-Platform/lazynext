import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FeedbackService } from '@/lib/services/feedback-service';

/** GET /api/feedback/entries — list feedback */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ feedback: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const category = url.searchParams.get('category') || undefined;
  const rating = url.searchParams.get('rating');
  const source = url.searchParams.get('source') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  const opts: Record<string, unknown> = {};
  if (category) opts.category = category;
  if (rating) opts.rating = parseInt(rating, 10);
  if (source) opts.source = source;
  if (search) opts.search = search;
  if (startDate && endDate) {
    opts.dateRange = [new Date(startDate), new Date(endDate)];
  }

  const feedback = await FeedbackService.list(organizationId, opts);
  return NextResponse.json({ feedback });
}

/** POST /api/feedback/entries — create feedback */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const content = String(body.content || '').trim();
  if (!content) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const feedback = await FeedbackService.create(organizationId, {
      source: body.source || 'form',
      content,
      rating: body.rating,
      customerId: body.customerId,
      category: body.category,
      tags: body.tags,
      submittedBy: session.user.id,
      workspaceId: body.workspaceId,
    });
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (e) {
    console.error('[feedback/entries] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_feedback' }, { status: 500 });
  }
}
