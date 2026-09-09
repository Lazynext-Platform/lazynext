import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MAService } from '@/lib/services/ma-service';

/** GET /api/ma/targets/[id] — get a single M&A target */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const target = await MAService.getTarget(id);
  if (!target) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ target });
}

/** PATCH /api/ma/targets/[id] — update an M&A target */
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
    const target = await MAService.updateTarget(id, {
      name: body.name, industry: body.industry, location: body.location,
      revenue: body.revenue, employees: body.employees, description: body.description,
      website: body.website, ownershipType: body.ownershipType, strategicFit: body.strategicFit,
      status: body.status, contactName: body.contactName, contactEmail: body.contactEmail,
    });
    if (!target) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ target });
  } catch (e) {
    console.error('[ma/targets] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_target' }, { status: 500 });
  }
}

/** DELETE /api/ma/targets/[id] — delete an M&A target */
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
    const ok = await MAService.deleteTarget(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[ma/targets] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_target' }, { status: 500 });
  }
}
