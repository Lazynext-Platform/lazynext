import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/filings/[id] — get a single filing */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const filing = await RegulatoryService.getFiling(id);
  if (!filing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ filing });
}

/** PATCH /api/regulatory/filings/[id] — update a filing */
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
    const filing = await RegulatoryService.updateFiling(id, {
      title: body.title, type: body.type, jurisdiction: body.jurisdiction, agency: body.agency,
      status: body.status, dueDate: body.dueDate, submittedDate: body.submittedDate,
      acceptedDate: body.acceptedDate, description: body.description,
      attachments: body.attachments, requirements: body.requirements,
      fees: body.fees, notes: body.notes,
    });
    if (!filing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ filing });
  } catch (e) {
    console.error('[regulatory/filings] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_filing' }, { status: 500 });
  }
}
