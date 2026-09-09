import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LegalMatterService } from '@/lib/services/legal-matter-service';

/** GET /api/legal/matters/[id] — get a matter by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const matter = await LegalMatterService.get(id);
  if (!matter) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ matter });
}

/** PATCH /api/legal/matters/[id] — update a matter */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const matter = await LegalMatterService.update(id, {
      title: body.title,
      description: body.description,
      type: body.type,
      priority: body.priority,
      assignedTo: body.assignedTo,
      opposingParty: body.opposingParty,
      caseNumber: body.caseNumber,
      court: body.court,
      filedDate: body.filedDate,
      closedDate: body.closedDate,
      estimatedCost: body.estimatedCost,
      actualCost: body.actualCost,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    if (!matter) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ matter });
  } catch (e) {
    console.error('[legal/matters] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_matter' }, { status: 500 });
  }
}

/** DELETE /api/legal/matters/[id] — delete a matter */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await LegalMatterService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
