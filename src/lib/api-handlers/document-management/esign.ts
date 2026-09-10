import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** GET /api/document-management/esign — list e-sign requests */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ requests: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? undefined;
  const requests = await DocumentManagementService.listESignRequests(
    organizationId,
    status ? { status: status as never } : {},
  );
  return NextResponse.json({ requests });
}

/** POST /api/document-management/esign — create an e-sign request */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const documentId = String(body.documentId || '').trim();
  const title = String(body.title || '').trim();
  const signers = Array.isArray(body.signers) ? body.signers : [];
  if (!documentId || !title || signers.length === 0) {
    return NextResponse.json({ error: 'documentId_title_signers_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const request = await DocumentManagementService.createESignRequest(
      ws.organizationId,
      ws.id,
      { documentId, title, signers, message: body.message, expiresAt: body.expiresAt },
      session.user.id,
    );
    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    console.error('[document-management/esign] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_esign_request' }, { status: 500 });
  }
}
