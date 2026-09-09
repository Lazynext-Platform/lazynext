import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/submissions/[id] — get a single submission */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const submission = await RegulatoryService.getSubmission(id);
  if (!submission) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ submission });
}

/** PATCH /api/regulatory/submissions/[id] — update a submission */
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
    const submission = await RegulatoryService.updateSubmission(id, {
      filingId: body.filingId, title: body.title, type: body.type, recipient: body.recipient,
      submittedDate: body.submittedDate, status: body.status, content: body.content,
      attachments: body.attachments, response: body.response, responseDate: body.responseDate,
    });
    if (!submission) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ submission });
  } catch (e) {
    console.error('[regulatory/submissions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_submission' }, { status: 500 });
  }
}
