import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LaborRelationsService } from '@/lib/services/labor-relations-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const dispute = await LaborRelationsService.getDispute(id);
  if (!dispute) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ dispute });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const dispute = await LaborRelationsService.updateDispute(id, body);
    if (!dispute) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ dispute });
  } catch (e) {
    console.error('[labor-relations/disputes] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_dispute' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await LaborRelationsService.deleteDispute(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
