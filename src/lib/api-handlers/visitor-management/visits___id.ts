import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { VisitorManagementService } from '@/lib/services/visitor-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const visit = await VisitorManagementService.getVisit(id);
  if (!visit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ visit });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const visit = await VisitorManagementService.updateVisit(id, body);
    if (!visit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ visit });
  } catch (e) {
    console.error('[visitor-management/visits] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_visit' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await VisitorManagementService.deleteVisit(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
