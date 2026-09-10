import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SupportService } from '@/lib/services/support';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/tickets — list tickets (query: workspaceId, status, priority, assigneeId, customerId).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;
  const status = sp.get('status') || undefined;
  const priority = sp.get('priority') || undefined;
  const assigneeId = sp.get('assigneeId') || undefined;
  const customerId = sp.get('customerId') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ tickets: [] });
    }

    let wsId = workspaceId;
    if (wsId) {
      const hasAccess = workspaces.some((w) => w.id === wsId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      wsId = workspaces[0].id;
    }

    const tickets = await SupportService.listTickets(wsId, { status, priority, assigneeId, customerId });
    return NextResponse.json({ tickets });
  } catch (e) {
    console.error('[tickets] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_tickets' }, { status: 500 });
  }
}

/**
 * POST /api/tickets — create a new ticket.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
    customerId?: string;
    subject?: string;
    description?: string;
    priority?: string;
    category?: string;
    channel?: string;
    assigneeId?: string;
    slaHours?: number;
    tags?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const subject = body.subject?.trim();
  if (!subject) {
    return NextResponse.json({ error: 'subject_required' }, { status: 400 });
  }
  const description = body.description?.trim() || '';

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    let organizationId = body.organizationId?.trim();
    let workspaceId = body.workspaceId?.trim();

    if (workspaceId) {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (!ws) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      organizationId = ws.organizationId;
    } else {
      organizationId = organizationId || workspaces[0].organizationId;
      workspaceId = workspaces.find((w) => w.organizationId === organizationId)?.id;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
    }

    const ticket = await SupportService.createTicket(workspaceId, {
      organizationId,
      customerId: body.customerId?.trim() || undefined,
      subject,
      description,
      priority: body.priority?.trim() || undefined,
      category: body.category?.trim() || undefined,
      channel: body.channel?.trim() || undefined,
      assigneeId: body.assigneeId?.trim() || undefined,
      reporterId: session.user.id,
      slaHours: body.slaHours,
      tags: body.tags,
    });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (e) {
    console.error('[tickets] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_ticket' }, { status: 500 });
  }
}
