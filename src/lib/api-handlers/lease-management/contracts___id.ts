import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LeaseManagementService } from '@/lib/services/lease-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const contract = await LeaseManagementService.getContract(id);
  if (!contract) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ contract });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const contract = await LeaseManagementService.updateContract(id, body);
    if (!contract) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ contract });
  } catch (e) {
    console.error('[lease-management/contracts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_contract' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await LeaseManagementService.deleteContract(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
