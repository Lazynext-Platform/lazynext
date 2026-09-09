import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LegalObligationService } from '@/lib/services/legal-obligation-service';

/** GET /api/legal/obligations/[id] — get an obligation by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const obligation = await LegalObligationService.get(id);
  if (!obligation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ obligation });
}

/** PATCH /api/legal/obligations/[id] — update an obligation */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const obligation = await LegalObligationService.update(id, {
      title: body.title,
      description: body.description,
      type: body.type,
      dueDate: body.dueDate,
      responsibleParty: body.responsibleParty,
      notes: body.notes,
    });
    if (!obligation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ obligation });
  } catch (e) {
    console.error('[legal/obligations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_obligation' }, { status: 500 });
  }
}

/** DELETE /api/legal/obligations/[id] — delete an obligation */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await LegalObligationService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
