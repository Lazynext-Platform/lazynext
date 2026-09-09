import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecordsManagementService } from '@/lib/services/records-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const legalHold = await RecordsManagementService.getLegalHold(id);
  if (!legalHold) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ legalHold });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const legalHold = await RecordsManagementService.updateLegalHold(id, body);
    if (!legalHold) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ legalHold });
  } catch (e) {
    console.error('[records-management/legal-holds] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_legal_hold' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await RecordsManagementService.deleteLegalHold(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
