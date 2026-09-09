import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateGivingService } from '@/lib/services/corporate-giving-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ donations: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const donations = await CorporateGivingService.listDonations(organizationId, opts as never);
  return NextResponse.json({ donations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const recipient = String(body.recipient || '').trim();
  const type = String(body.type || '').trim();
  if (!recipient || !type) return NextResponse.json({ error: 'recipient_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const donation = await CorporateGivingService.createDonation(ws.organizationId, ws.id, {
      recipient, type: type as never,
      amount: body.amount, description: body.description, status: body.status,
      date: body.date, category: body.category, purpose: body.purpose,
      restrictions: body.restrictions, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ donation }, { status: 201 });
  } catch (e) {
    console.error('[corporate-giving/donations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_donation' }, { status: 500 });
  }
}
