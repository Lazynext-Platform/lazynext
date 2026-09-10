import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmergencyResponseService } from '@/lib/services/emergency-response-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const contact = await EmergencyResponseService.getEmergencyContact(id);
  if (!contact) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ contact });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const contact = await EmergencyResponseService.updateEmergencyContact(id, body);
    if (!contact) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ contact });
  } catch (e) {
    console.error('[emergency-response/contacts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_contact' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await EmergencyResponseService.deleteEmergencyContact(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
