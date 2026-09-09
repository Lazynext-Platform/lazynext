import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/submissions — list submissions */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ submissions: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { filingId?: string; status?: string; type?: string } = {};
  const filingId = url.searchParams.get('filingId');
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  if (filingId) opts.filingId = filingId;
  if (status) opts.status = status;
  if (type) opts.type = type;

  const submissions = await RegulatoryService.listSubmissions(organizationId, opts as never);
  return NextResponse.json({ submissions });
}

/** POST /api/regulatory/submissions — create a submission */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const recipient = String(body.recipient || '').trim();
  if (!title || !type || !recipient) {
    return NextResponse.json({ error: 'title_type_and_recipient_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const submission = await RegulatoryService.createSubmission(
      ws.organizationId, ws.id,
      {
        filingId: body.filingId, title, type, recipient,
        submittedDate: body.submittedDate, status: body.status,
        content: body.content, attachments: body.attachments,
        response: body.response, responseDate: body.responseDate,
      },
      session.user.id,
    );
    return NextResponse.json({ submission }, { status: 201 });
  } catch (e) {
    console.error('[regulatory/submissions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_submission' }, { status: 500 });
  }
}
