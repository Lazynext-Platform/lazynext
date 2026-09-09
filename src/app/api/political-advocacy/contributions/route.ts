import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PoliticalAdvocacyService } from '@/lib/services/political-advocacy-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ contributions: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const contributions = await PoliticalAdvocacyService.listContributions(organizationId, opts as never);
  return NextResponse.json({ contributions });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const recipient = String(body.recipient || '').trim();
  const type = String(body.type || '').trim();
  const amount = Number(body.amount);
  if (!recipient || !type || !amount) return NextResponse.json({ error: 'recipient_type_amount_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const contribution = await PoliticalAdvocacyService.createContribution(ws.organizationId, ws.id, {
      recipient, type: type as never, amount,
      currency: body.currency, description: body.description, status: body.status,
      date: body.date, recipientType: body.recipientType, committee: body.committee,
      purpose: body.purpose, approvalRequired: body.approvalRequired,
      approvedBy: body.approvedBy, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ contribution }, { status: 201 });
  } catch (e) {
    console.error('[political-advocacy/contributions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_contribution' }, { status: 500 });
  }
}
