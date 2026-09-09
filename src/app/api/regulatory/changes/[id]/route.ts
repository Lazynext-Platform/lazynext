import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/changes/[id] — get a single change */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const change = await RegulatoryService.getChange(id);
  if (!change) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ change });
}

/** PATCH /api/regulatory/changes/[id] — update a change */
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
    const change = await RegulatoryService.updateChange(id, {
      title: body.title, type: body.type, jurisdiction: body.jurisdiction, agency: body.agency,
      description: body.description, effectiveDate: body.effectiveDate,
      impactLevel: body.impactLevel, impactAreas: body.impactAreas,
      status: body.status, source: body.source, reference: body.reference,
    });
    if (!change) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ change });
  } catch (e) {
    console.error('[regulatory/changes] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_change' }, { status: 500 });
  }
}
