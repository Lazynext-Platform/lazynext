import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LegalObligationService } from '@/lib/services/legal-obligation-service';

/** GET /api/legal/obligations — list obligations */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ obligations: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const obligations = await LegalObligationService.list(organizationId, {
    contractId: sp.get('contractId') || undefined,
    matterId: sp.get('matterId') || undefined,
    type: (sp.get('type') as 'payment' | 'delivery' | 'reporting' | 'compliance' | 'confidentiality' | 'non_compete' | 'other') || undefined,
    status: (sp.get('status') as 'pending' | 'fulfilled' | 'breached' | 'waived') || undefined,
    dateFrom: sp.get('dateFrom') || undefined,
    dateTo: sp.get('dateTo') || undefined,
  });

  return NextResponse.json({ obligations });
}

/** POST /api/legal/obligations — create an obligation */
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

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const obligation = await LegalObligationService.create(organizationId, {
      contractId: body.contractId,
      matterId: body.matterId,
      title,
      description: body.description,
      type: body.type,
      dueDate: body.dueDate,
      status: body.status,
      responsibleParty: body.responsibleParty,
      notes: body.notes,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ obligation }, { status: 201 });
  } catch (e) {
    console.error('[legal/obligations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_obligation' }, { status: 500 });
  }
}
