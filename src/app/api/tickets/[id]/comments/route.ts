import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SupportService } from '@/lib/services/support';

/**
 * GET /api/tickets/[id]/comments — list comments for a ticket.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ticket = await SupportService.getTicket(id);
    if (!ticket) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const comments = await SupportService.listComments(id);
    return NextResponse.json({ comments });
  } catch (e) {
    console.error('[tickets] list comments error:', e);
    return NextResponse.json({ error: 'failed_to_list_comments' }, { status: 500 });
  }
}

/**
 * POST /api/tickets/[id]/comments — add a comment to a ticket.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    authorType?: string;
    body?: string;
    isInternal?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const commentBody = body.body?.trim();
  if (!commentBody) {
    return NextResponse.json({ error: 'body_required' }, { status: 400 });
  }

  try {
    const ticket = await SupportService.getTicket(id);
    if (!ticket) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const comment = await SupportService.addComment(id, {
      authorId: session.user.id,
      authorType: body.authorType?.trim() || 'agent',
      body: commentBody,
      isInternal: body.isInternal,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (e) {
    console.error('[tickets] add comment error:', e);
    return NextResponse.json({ error: 'failed_to_add_comment' }, { status: 500 });
  }
}
