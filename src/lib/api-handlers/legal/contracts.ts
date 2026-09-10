import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LegalContractService } from '@/lib/services/legal-contract-service';

/** GET /api/legal/contracts — list contracts */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ contracts: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const contracts = await LegalContractService.list(organizationId, {
    type: (sp.get('type') as 'nda' | 'employment' | 'vendor' | 'client' | 'partnership' | 'license' | 'lease' | 'service_agreement' | 'other') || undefined,
    status: (sp.get('status') as 'draft' | 'active' | 'expired' | 'terminated' | 'under_review') || undefined,
    partyName: sp.get('partyName') || undefined,
    search: sp.get('search') || undefined,
    dateFrom: sp.get('dateFrom') || undefined,
    dateTo: sp.get('dateTo') || undefined,
  });

  return NextResponse.json({ contracts });
}

/** POST /api/legal/contracts — create a contract */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!body.type) {
    return NextResponse.json({ error: 'type_required' }, { status: 400 });
  }
  if (!body.partyName) {
    return NextResponse.json({ error: 'partyName_required' }, { status: 400 });
  }
  if (!body.effectiveDate) {
    return NextResponse.json({ error: 'effectiveDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const contract = await LegalContractService.create(organizationId, {
      title,
      type: body.type,
      partyName: body.partyName,
      partyType: body.partyType,
      effectiveDate: body.effectiveDate,
      endDate: body.endDate,
      value: body.value,
      currency: body.currency,
      status: body.status,
      jurisdiction: body.jurisdiction,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ contract }, { status: 201 });
  } catch (e) {
    console.error('[legal/contracts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_contract' }, { status: 500 });
  }
}
