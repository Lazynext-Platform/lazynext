import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/requirements/[id] — get a single requirement */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const requirement = await RegulatoryService.getRequirement(id);
  if (!requirement) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ requirement });
}

/** PATCH /api/regulatory/requirements/[id] — update a requirement */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const requirement = await RegulatoryService.updateRequirement(id, {
      title: body.title, description: body.description, jurisdiction: body.jurisdiction,
      agency: body.agency, category: body.category, frequency: body.frequency,
      owner: body.owner, status: body.status, lastAssessed: body.lastAssessed,
      nextAssessment: body.nextAssessment, evidence: body.evidence, references: body.references,
    });
    if (!requirement) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ requirement });
  } catch (e) {
    console.error('[regulatory/requirements] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_requirement' }, { status: 500 });
  }
}

/** DELETE /api/regulatory/requirements/[id] — delete a requirement */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await RegulatoryService.deleteRequirement(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[regulatory/requirements] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_requirement' }, { status: 500 });
  }
}
