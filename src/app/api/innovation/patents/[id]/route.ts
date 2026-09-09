import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InnovationService } from '@/lib/services/innovation-service';

/** GET /api/innovation/patents/[id] — get a single patent */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const patent = await InnovationService.getPatent(id);
  if (!patent) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ patent });
}

/** PATCH /api/innovation/patents/[id] — update a patent */
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
    const patent = await InnovationService.updatePatent(id, {
      title: body.title, applicationNumber: body.applicationNumber, filingDate: body.filingDate,
      status: body.status, inventor: body.inventor, assignee: body.assignee, abstract: body.abstract,
      claims: body.claims, patentType: body.patentType, jurisdiction: body.jurisdiction,
      grantedDate: body.grantedDate, expiryDate: body.expiryDate,
    });
    if (!patent) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ patent });
  } catch (e) {
    console.error('[innovation/patents] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_patent' }, { status: 500 });
  }
}

/** DELETE /api/innovation/patents/[id] — delete a patent */
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
    const ok = await InnovationService.deletePatent(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[innovation/patents] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_patent' }, { status: 500 });
  }
}
