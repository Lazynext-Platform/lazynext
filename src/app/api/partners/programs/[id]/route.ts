import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PartnerService } from '@/lib/services/partner-service';

/** GET /api/partners/programs/[id] — get a single program */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const program = await PartnerService.getProgram(id);
  if (!program) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ program });
}

/** PATCH /api/partners/programs/[id] — update a program */
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
    const program = await PartnerService.updateProgram(id, {
      name: body.name, description: body.description, type: body.type,
      requirements: body.requirements, benefits: body.benefits,
      marginRate: body.marginRate, status: body.status,
      startDate: body.startDate, endDate: body.endDate,
    });
    if (!program) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ program });
  } catch (e) {
    console.error('[partners/programs] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_program' }, { status: 500 });
  }
}

/** DELETE /api/partners/programs/[id] — delete a program */
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
    const ok = await PartnerService.deleteProgram(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[partners/programs] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_program' }, { status: 500 });
  }
}
