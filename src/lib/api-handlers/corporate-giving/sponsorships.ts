import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateGivingService } from '@/lib/services/corporate-giving-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ sponsorships: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const sponsorships = await CorporateGivingService.listSponsorships(organizationId, opts as never);
  return NextResponse.json({ sponsorships });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) return NextResponse.json({ error: 'name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const sponsorship = await CorporateGivingService.createSponsorship(ws.organizationId, ws.id, {
      name, type: type as never,
      recipient: body.recipient, amount: body.amount, description: body.description,
      status: body.status, startDate: body.startDate, endDate: body.endDate,
      benefits: body.benefits, terms: body.terms, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ sponsorship }, { status: 201 });
  } catch (e) {
    console.error('[corporate-giving/sponsorships] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_sponsorship' }, { status: 500 });
  }
}
