import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecordsManagementService } from '@/lib/services/records-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const disposal = await RecordsManagementService.getDisposal(id);
  if (!disposal) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ disposal });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const disposal = await RecordsManagementService.updateDisposal(id, body);
    if (!disposal) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ disposal });
  } catch (e) {
    console.error('[records-management/disposals] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_disposal' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await RecordsManagementService.deleteDisposal(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
