import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SupportService } from '@/lib/services/support';

/**
 * GET /api/tickets/[id] — get a ticket by ID with comments.
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
    return NextResponse.json({ ticket });
  } catch (e) {
    console.error('[tickets] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_ticket' }, { status: 500 });
  }
}

/**
 * PATCH /api/tickets/[id] — update a ticket.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    subject?: string;
    description?: string;
    priority?: string;
    category?: string;
    channel?: string;
    assigneeId?: string;
    reporterId?: string;
    customerId?: string;
    tags?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.subject !== undefined) {
    const subject = body.subject?.trim();
    if (!subject) {
      return NextResponse.json({ error: 'subject_required' }, { status: 400 });
    }
    body.subject = subject;
  }

  try {
    const existing = await SupportService.getTicket(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const updated = await SupportService.updateTicket(id, {
      subject: body.subject,
      description: body.description?.trim(),
      priority: body.priority?.trim(),
      category: body.category?.trim(),
      channel: body.channel?.trim(),
      assigneeId: body.assigneeId?.trim(),
      reporterId: body.reporterId?.trim(),
      customerId: body.customerId?.trim(),
      tags: body.tags,
    });
    return NextResponse.json({ ticket: updated });
  } catch (e) {
    console.error('[tickets] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_ticket' }, { status: 500 });
  }
}

/**
 * DELETE /api/tickets/[id] — close (soft delete) a ticket.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await SupportService.getTicket(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const ticket = await SupportService.deleteTicket(id);
    return NextResponse.json({ ticket });
  } catch (e) {
    console.error('[tickets] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_ticket' }, { status: 500 });
  }
}
